//+------------------------------------------------------------------+
//| Chances_robot.mq4 |
//| Copyright 2009, MetaQuotes Software Corp. |
//| http://www.metaquotes.net |
//+------------------------------------------------------------------+
#property copyright "Copyright 2009, MetaQuotes Software Corp."
#property link "http://www.metaquotes.net"

extern string _si_E = "Параметры системы------------------";
extern int _D=5; // % - шаг для открытия ордеров (% от текущего значения канала, по умолчанию - 32);
extern double _Init_Init_Lot=0.01; //- начальный лот (по умолчанию - минимальный допустимый лот);
extern double _Max_Init_Lot=5; //- максимально допустимый лот, при достижении которого значение лота на "переворот" сбрасывается в начальное (Init_Lot), а не удваивается.
extern int _Min_Channel=30; // в пунктах - минимальный канал для работы. Если значение канала меньше - не расставляем ордера на границах, ждем (по умолчанию - 60).
extern int _Max_Channel=230; //в пунктах - максимальный канал для работы. Если канал шире, то Stop-loss и Take-profit устанавливаются не на ширину канала, а на значение Max_Channel (по умолчанию - 250).
extern bool _Double_First_Lot=false; //- флаг, если False, то при первом перевороте лот не удваивается (по умолчанию - True).
extern int _ChannelPeriod=18; //период индикатора
extern int _Max_orders_count = 1000;

extern string _si_Interception = "перехват старта эксперта-------------------";
extern bool _bInterception=false; // перехват старта эксперта
extern int _TimeSleep=10; //время задержки
int g_FunctionExpert=0; //показатель работы эксперта

double mult, Min_Channel, Max_Channel, Channel, High_border, Low_border, New_border, StopLevel, Range;
double rLot;
int n, err, rOp, Ticket, pool_size = 1000000;

//+------------------------------------------------------------------+
//| expert initialization function |
//+------------------------------------------------------------------+
int init()
{
   if(Digits > 3)
      mult = 0.0001;  // EUR - #.####(#)
   else
      mult = 0.01;    // JPY - #.##(#)
   
   if(MarketInfo(Symbol(), MODE_MAXLOT) < _Max_Init_Lot)
      _Max_Init_Lot = MarketInfo(Symbol(), MODE_MAXLOT);

   Min_Channel = NormalizeDouble(_Min_Channel * mult, Digits);
   Max_Channel = NormalizeDouble(_Max_Channel * mult, Digits);
   StopLevel = MarketInfo(Symbol(),MODE_STOPLEVEL) * Point + MarketInfo(Symbol(),MODE_SPREAD) * Point;
}
//+------------------------------------------------------------------+
//| expert deinitialization function |
//+------------------------------------------------------------------+
int deinit()
{
}
//+------------------------------------------------------------------+
//| expert start function |
//+------------------------------------------------------------------+
int start()
{
  // До тех пор, пока пользователь не прекратит исполнение программы
  while(!IsStopped() && IsTradeAllowed())
  {
    if(!IsTesting() && !MarketInfo(Symbol(),MODE_TRADEALLOWED))
    {
      Comment("Trade on instrument prohibited! ");
      return;
    }

    if(!IsTesting()
        && (
        (!IsExpertEnabled()
        || !IsConnected()
        || IsTradeContextBusy()
        )))
      break;
    else
      g_FunctionExpert=2;

    RefreshRates();

    Open_orders(18, 0);
    Open_orders(54, pool_size);
    Open_orders(108, 2 * pool_size);

    Process_orders();

    if(IsTesting()
        || !_bInterception
        || g_FunctionExpert!=2)
      break;

    Sleep(_TimeSleep);
  }
}
// ////////////////////////////////////////////////////////////////////////////
//    OPEN ORDERS
// ////////////////////////////////////////////////////////////////////////////
void Open_orders(int N, int C)
{
// Check if we've got too many orders opened already
      if(OrdersTotal() >= _Max_orders_count / 2)
         return;

      High_border=iCustom(Symbol(),Period(),"Price Channel",N,0,0); // _ChannelPeriod
      Low_border=iCustom(Symbol(),Period(),"Price Channel",N,1,0);
      Channel=NormalizeDouble(High_border-Low_border,Digits);
      Range = Channel / 100 * _D + MarketInfo(Symbol(),MODE_SPREAD) * Point;
      
// Check if the Channel is wide enough
      if(Channel < Min_Channel)
         return;
         
// Limit the Channel
      if(Channel > Max_Channel)
         Channel = Max_Channel;
       
//  Check if we have a bounce from the High border, which allows us to place the Order
      if((Ask < High_border - StopLevel)
            && (High_border == iCustom(Symbol(),Period(),"Price Channel",N,0,3)))
      {
//  and there are no BUY Orders within _D range near High border
         if(No_Orders_near(OP_BUYSTOP, High_border))
         {
//   System 0 (default): Place opening order followed by Stop-loss and Take-profit
                if(0 > OrderSend(Symbol(), OP_BUYSTOP, _Init_Init_Lot, High_border
                              , 0 // Slippage
                              , NormalizeDouble(High_border - Channel, Digits) // Stop loss
                              , NormalizeDouble(High_border + Channel, Digits) // Take profit
                              , "" // Comment
                              , C // Magic
                              , 0 // Life-Time
                              , Blue))
                {
                  err=GetLastError();
                  Print("error(",err,"): ", ErrorDescription(err));
                }
                else
                {
//    Delete all active BUY orders above
                  for(n=0; n<OrdersTotal(); n++)
                  {
                      if(!OrderSelect(n,SELECT_BY_POS,MODE_TRADES))
                        continue;

                      if((OrderMagicNumber() < C) || (OrderMagicNumber() >= C + pool_size))
                        continue;

                      if((OrderSymbol() == Symbol()) && (OrderMagicNumber() % pool_size == 0)
                              && ((OrderType() == OP_BUYSTOP) || (OrderType() == OP_SELLLIMIT)))
                         if((OrderOpenPrice() > High_border)) // && (OrderOpenPrice() < High_border + Range))
                            OrderDelete(OrderTicket(), Red);
                  }
                }
//  System 2: (another channel upon the Channel):
//  This is to catch the spring and re-open the position
                New_border = NormalizeDouble(High_border + Channel / 100 * _D / 2, Digits);
                if(0 > OrderSend(Symbol(), OP_SELLLIMIT, _Init_Init_Lot, New_border
                              , 0 // Slippage
                              , NormalizeDouble(New_border + Channel, Digits) // Stop loss
                              , NormalizeDouble(New_border - Channel, Digits) // Take profit
                              , "" // Comment
                              , C // Magic
                              , 0 // Life-Time
                              , Blue))
                {
                  err=GetLastError();
                  Print("error (Syst 2) (",err,"): ", ErrorDescription(err));
                }
         }
      }

//  Check if we have a bounce from the Low border, which allows us to place the Order
      if((Bid > Low_border + StopLevel)
            && (Low_border == iCustom(Symbol(),Period(),"Price Channel",N,0,3)))
      {
//  and there are no BUY Orders within _D range near High border (including Reverts)
         if(No_Orders_near(OP_SELLSTOP, Low_border))
         {
//   System 0 (default): Place opening order followed by Stop-loss and Take-profit
                Ticket = OrderSend(Symbol(), OP_SELLSTOP, _Init_Init_Lot, Low_border
                              , 0 // Slippage
                              , NormalizeDouble(Low_border + Channel, Digits) // Stop loss
                              , NormalizeDouble(Low_border - Channel, Digits) // Take profit
                              , "" // Comment
                              , C // Magic
                              , 0 // Life-Time
                              , Blue);

                if(Ticket < 0)
                {
                  err=GetLastError();
                  Print("error(",err,"): ", ErrorDescription(err));
                }
                else
                {
//    Delete all active orders below (of the same Channel only)
                  for(n=0; n<OrdersTotal(); n++)
                  {
                      if(!OrderSelect(n,SELECT_BY_POS,MODE_TRADES))
                        continue;

                      if((OrderMagicNumber() < C) || (OrderMagicNumber() >= C + pool_size))
                        continue;

                      if((OrderSymbol() == Symbol()) && (OrderMagicNumber() % pool_size == 0) 
                              && ((OrderType() == OP_SELLSTOP) || (OrderType() == OP_BUYLIMIT)))
                         if((OrderOpenPrice() < Low_border)) // && (OrderOpenPrice() > Low_border - Range))
                            OrderDelete(OrderTicket(), Red);
                  }
                }
//  System 2: (another channel below the channel):
//  This is to catch the spring and re-open the position
                New_border = NormalizeDouble(Low_border - Channel / 100 * _D / 2, Digits);
                if(0 > OrderSend(Symbol(), OP_BUYLIMIT, _Init_Init_Lot, New_border
                              , 0 // Slippage
                              , NormalizeDouble(New_border - Channel, Digits) // Stop loss
                              , NormalizeDouble(New_border + Channel, Digits) // Take profit
                              , "" // Comment
                              , C // Magic
                              , 0 // Life-Time
                              , Blue))
                {
                  err=GetLastError();
                  Print("error (Syst 2) (",err,"): ", ErrorDescription(err));
                }
         }
      }
}
// ////////////////////////////////////////////////////////////////////////////
//    PROCESS ORDERS
// ////////////////////////////////////////////////////////////////////////////
int Process_orders()
{
// Select those Reverts, that have their Revertees closed with profit
//  and those orders that were triggered but not reverted yet

/*     int revert = 0;
     double Price = 0;
     color Color;
     for(int i=0; i<OrdersTotal(); i++)
     {
        if(!OrderSelect(i,SELECT_BY_POS,MODE_TRADES))
              continue;
        Price = Price + OrderProfit();
        
        if((OrderLots()>_Init_Init_Lot) && (OrderType()<=1))
        {
            Price = Price - (OrderLots()-_Init_Init_Lot)*MathAbs(OrderOpenPrice()-OrderStopLoss())*100000;
            revert = 1;
//            Print("lost before: ",(OrderLots()-_Init_Init_Lot)*MathAbs(OrderOpenPrice()-OrderStopLoss())*100000);
        }
     }

     if(Price > 3)
     {
       for(i=0; i<OrdersTotal(); i++)
       {
          if(!OrderSelect(i,SELECT_BY_POS,MODE_TRADES))
                continue;
          
             if(OrderType() == OP_BUY)
             {
                Price = Bid;
                Color = Blue;
             }
             else
             {
                Price = Ask;
                Color = Red;
             }

             if(OrderType() > 1)
             {
               if(!OrderDelete(OrderTicket()))
                   Print(ErrorDescription(GetLastError()));
             }
             else
             {
               if(!OrderClose(OrderTicket(), OrderLots(), Price, .00002, Color))
                   Print(ErrorDescription(GetLastError()));
             }
       }
     }
*/

      for(n=0; n<OrdersTotal(); n++)
      {
         if(!OrderSelect(n,SELECT_BY_POS,MODE_TRADES))
            continue;
         
         if(OrderSymbol() != Symbol())
            continue;

//  Check if it is a Revert, and it's not in market yet
         Ticket = OrderTicket();
         if((OrderMagicNumber() % pool_size != 0) && (OrderType() >1))
         {
//   and its Revertee was closed with Profit
            if(OrderSelect(OrderMagicNumber(),SELECT_BY_TICKET))
            {
                if((OrderProfit() > 0) && (OrderCloseTime() != 0))
                {
//    if it was, then drop the Revert
                     OrderDelete(Ticket);
                     continue;
                }
            }
            OrderSelect(Ticket,SELECT_BY_TICKET);  // restore the focus at the Order
         }
         
//  Check if the Order needs to be reverted (it is in Market)
         if(OrderType() < 2)
         {
// Check that there is no revert yet with this price
            if(OrderType() == OP_BUY)
               rOp = OP_SELLSTOP;
            else
               rOp = OP_BUYSTOP;

            if(No_Revert(rOp, OrderStopLoss()))
            {
               OrderSelect(Ticket,SELECT_BY_TICKET);  // The focus was lost by No_Orders_exactly

// Double the Lot, with  respect of the _Double_First_Lot setting for a first revert
               if((!_Double_First_Lot) && (OrderMagicNumber() % pool_size == 0))
                  rLot = OrderLots();
               else
                  rLot = OrderLots() * 2;

// Limit the lot to the Maximum - reset to the initial once Max is reached
               if(rLot > _Max_Init_Lot)
                  rLot = _Init_Init_Lot; //  * 2

               if(0 > OrderSend(Symbol(), rOp, rLot, OrderStopLoss()
                              , 0       // Slippage
                              , OrderOpenPrice()
                              , NormalizeDouble(2 * OrderStopLoss() - OrderOpenPrice(), Digits)
                              , ""              // Comment
                              , OrderTicket()   // Magic
                              , 0               // Life-Time
                              , Blue))
               {
                  err=GetLastError();
                  Print("error(",err,"): ", ErrorDescription(err));
               }
            }
         }
      }
}
////////////////////////////////////////////////////////   
// Check active orders within $D range
//  Add the $spread value to Range - this makes sence when the channel is tight
//
bool No_Orders_near(int fType, double fPrice)
{
// This receives OP_BUYSTOP (or OP_SELLSTOP), but check OP_BUY (or OP_SELL)
  for(int i=0; i<OrdersTotal(); i++)
  {
    if(!OrderSelect(i,SELECT_BY_POS,MODE_TRADES))
      continue;

    if((OrderSymbol() == Symbol()) && ((fType == OrderType()) || (fType - 2 == OrderType()) || (fType - 4 == OrderType())))
       if(MathAbs(OrderOpenPrice() - fPrice) < Range)
         return (false);
  }
  return (true);
}
////////////////////////////////////////////////////////
// Check active orders exactly at the given price
//
bool No_Revert(int fType, double fPrice)
{
  for(int i=0; i<OrdersTotal(); i++)
  {
    if(!OrderSelect(i,SELECT_BY_POS,MODE_TRADES))
      continue;

    if((OrderSymbol() == Symbol()) && (fType == OrderType()) && (OrderMagicNumber() % pool_size != 0))
       if(OrderOpenPrice() == fPrice)
         return (false);
  }
  return (true);
}
////////////////////////////////////////////////////////
//= получить строку ошибки
string ErrorDescription(int fError= -1)
{
  string ps;

  switch(fError)
  {
    case 0: ps=" Нет ошибки."; break;
    case 1: ps=" Нет ошибки, но результат неизвестен."; break;
    case 2: ps=" Общая ошибка."; break;
    case 3: ps=" Неправильные параметры."; break;
    case 4: ps=" Торговый сервер занят."; break;
    case 5: ps=" Старая версия клиентского терминала."; break;
    case 6: ps=" Нет связи с торговым сервером."; break;
    case 7: ps=" Недостаточно прав."; break;
    case 8: ps=" Слишком частые запросы."; break;
    case 9: ps=" Недопустимая операция нарушающая функционирование сервера."; break;

    case 64: ps=" Счет заблокирован."; break;
    case 65: ps=" Неправильный номер счета."; break;

    case 128: ps=" Истек срок ожидания совершения сделки."; break;
    case 129: ps=" Неправильная цена."; break;
    case 130: ps=" Неправильные стопы."; break;
    case 131: ps=" Неправильный объем."; break;
    case 132: ps=" Рынок закрыт."; break;
    case 133: ps=" Торговля запрещена."; break;
    case 134: ps=" Недостаточно денег для совершения операции."; break;
    case 135: ps=" Цена изменилась."; break;
    case 136: ps=" Нет цен."; break;
    case 137: ps=" Брокер занят."; break;
    case 138: ps=" Новые цены."; break;
    case 139: ps=" Ордер заблокирован и уже обрабатывается."; break;
    case 140: ps=" Разрешена только покупка."; break;
    case 141: ps=" Слишком много запросов."; break;
    case 145: ps=" Модификация запрещена, так как ордер слишком близок к рынку."; break;
    case 146: ps=" Подсистема торговли занята."; break;
    case 147: ps=" Использование даты истечения ордера запрещено брокером."; break;
    case 148: ps=" Количество открытых и отложенных ордеров достигло предела, установленного брокером."; break;

    case 4000: ps=" Нет ошибки."; break;
    case 4001: ps=" Неправильный указатель функции."; break;
    case 4002: ps=" Индекс массива - вне диапазона."; break;
    case 4003: ps=" Нет памяти для стека функций."; break;
    case 4004: ps=" Переполнение стека после рекурсивного вызова."; break;
    case 4005: ps=" На стеке нет памяти для передачи параметров."; break;
    case 4006: ps=" Нет памяти для строкового параметра."; break;
    case 4007: ps=" Нет памяти для временной строки."; break;
    case 4008: ps=" Неинициализированная строка."; break;
    case 4009: ps=" Неинициализированная строка в массиве."; break;
    case 4010: ps=" Нет памяти для строкового массива."; break;
    case 4011: ps=" Слишком длинная строка."; break;
    case 4012: ps=" Остаток от деления на ноль."; break;
    case 4013: ps=" Деление на ноль."; break;
    case 4014: ps=" Неизвестная команда."; break;
    case 4015: ps=" Неправильный переход."; break;
    case 4016: ps=" Неинициализированный массив."; break;
    case 4017: ps=" Вызовы DLL не разрешены."; break;
    case 4018: ps=" Невозможно загрузить библиотеку."; break;
    case 4019: ps=" Невозможно вызвать функцию."; break;
    case 4020: ps=" Вызовы внешних библиотечных функций не разрешены."; break;
    case 4021: ps=" Недостаточно памяти для строки, возвращаемой из функции."; break;
    case 4022: ps=" Система занята."; break;
    case 4050: ps=" Неправильное количество параметров функции."; break;
    case 4051: ps=" Недопустимое значение параметра функции."; break;
    case 4052: ps=" Внутренняя ошибка строковой функции."; break;
    case 4053: ps=" Ошибка массива."; break;
    case 4054: ps=" Неправильное использование массива-таймсерии."; break;
    case 4055: ps=" Ошибка пользовательского индикатора."; break;
    case 4056: ps=" Массивы несовместимы."; break;
    case 4057: ps=" Ошибка обработки глобальныех переменных."; break;
    case 4058: ps=" Глобальная переменная не обнаружена."; break;
    case 4059: ps=" Функция не разрешена в тестовом режиме."; break;
    case 4060: ps=" Функция не разрешена."; break;
    case 4061: ps=" Ошибка отправки почты."; break;
    case 4062: ps=" Ожидается параметр типа string."; break;
    case 4063: ps=" Ожидается параметр типа integer."; break;
    case 4064: ps=" Ожидается параметр типа double."; break;
    case 4065: ps=" В качестве параметра ожидается массив."; break;
    case 4066: ps=" Запрошенные исторические данные в состоянии обновления."; break;
    case 4067: ps=" Ошибка при выполнении торговой операции."; break;
    case 4099: ps=" Конец файла."; break;

    case 4100: ps=" Ошибка при работе с файлом."; break;
    case 4101: ps=" Неправильное имя файла."; break;
    case 4102: ps=" Слишком много открытых файлов."; break;
    case 4103: ps=" Невозможно открыть файл."; break;
    case 4104: ps=" Несовместимый режим доступа к файлу."; break;
    case 4105: ps=" Ни один ордер не выбран."; break;
    case 4106: ps=" Неизвестный символ."; break;
    case 4107: ps=" Неправильный параметр цены для торговой функции."; break;
    case 4108: ps=" Неверный номер тикета."; break;
    case 4109: ps=" Торговля не разрешена. Необходимо включить опцию (Разрешить советнику торговать) в свойствах эксперта."; break;
    case 4110: ps=" Длинные позиции не разрешены. Необходимо проверить свойства эксперта."; break;
    case 4111: ps=" Короткие позиции не разрешены. Необходимо проверить свойства эксперта."; break;

    case 4200: ps=" Объект уже существует."; break;
    case 4201: ps=" Запрошено неизвестное свойство объекта."; break;
    case 4202: ps=" Объект не существует."; break;
    case 4203: ps=" Неизвестный тип объекта."; break;
    case 4204: ps=" Нет имени объекта."; break;
    case 4205: ps=" Ошибка координат объекта."; break;
    case 4206: ps=" Не найдено указанное подокно."; break;
    case 4207: ps=" Ошибка при работе с объектом."; break;

    default:   ps=" Unknown error";
  }
  return (ps);
}