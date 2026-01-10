/**
 * Screening Page Logic
 * Handles cryptocurrency screening interface and visualization
 */

class ScreeningManager {
  constructor() {
    this.currentTaskId = null;
    this.pollInterval = null;
    this.latestReport = null;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Run Screening button
    const runBtn = document.getElementById('runScreening');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runScreening());
    }

    // Export buttons
    const exportJSONBtn = document.getElementById('exportScreeningJSON');
    if (exportJSONBtn) {
      exportJSONBtn.addEventListener('click', () => this.exportJSON());
    }

    const exportMarkdownBtn = document.getElementById('exportScreeningMarkdown');
    if (exportMarkdownBtn) {
      exportMarkdownBtn.addEventListener('click', () => this.exportMarkdown());
    }

    const copyPairsBtn = document.getElementById('copyTradingPairs');
    if (copyPairsBtn) {
      copyPairsBtn.addEventListener('click', () => this.copyTradingPairs());
    }
  }

  async runScreening() {
    try {
      const runBtn = document.getElementById('runScreening');
      runBtn.disabled = true;
      runBtn.textContent = '⏳ Running...';

      // Show progress
      const progressDiv = document.getElementById('screeningProgress');
      progressDiv.style.display = 'block';

      // Start screening
      const response = await fetch('/api/screening/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.taskId) {
        this.currentTaskId = data.taskId;
        this.pollScreeningStatus();
      } else {
        throw new Error('No task ID returned');
      }
    } catch (error) {
      console.error('Failed to start screening:', error);
      alert('Failed to start screening: ' + error.message);
      this.resetScreeningUI();
    }
  }

  pollScreeningStatus() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/screening/status/${this.currentTaskId}`);
        const task = await response.json();

        this.updateProgress(task);

        if (task.status === 'completed') {
          clearInterval(this.pollInterval);
          await this.loadLatestReport();
          this.resetScreeningUI();
        } else if (task.status === 'failed') {
          clearInterval(this.pollInterval);
          alert('Screening failed: ' + (task.error || 'Unknown error'));
          this.resetScreeningUI();
        }
      } catch (error) {
        console.error('Failed to poll screening status:', error);
      }
    }, 2000);
  }

  updateProgress(task) {
    const progressBar = document.getElementById('screeningProgressBar');
    const progressText = document.getElementById('screeningProgressText');

    // Update progress bar
    const progress = ((task.stage + 1) / 4) * 100;
    progressBar.style.width = progress + '%';

    // Update progress text
    progressText.textContent = task.progress || 'Processing...';

    // Update stages
    for (let i = 0; i <= 3; i++) {
      const stageEl = document.getElementById(`stage${i}`);
      if (stageEl) {
        stageEl.classList.remove('active', 'completed');
        if (i < task.stage) {
          stageEl.classList.add('completed');
        } else if (i === task.stage) {
          stageEl.classList.add('active');
        }
      }
    }
  }

  resetScreeningUI() {
    const runBtn = document.getElementById('runScreening');
    runBtn.disabled = false;
    runBtn.innerHTML = '<span data-i18n="screening.runScreening">🚀 Run Screening</span>';

    const progressDiv = document.getElementById('screeningProgress');
    progressDiv.style.display = 'none';
  }

  async loadLatestReport() {
    try {
      const response = await fetch('/api/screening/latest');
      if (!response.ok) {
        throw new Error('No screening report available');
      }

      this.latestReport = await response.json();
      this.displayReport(this.latestReport);

      // Enable export buttons
      document.getElementById('exportScreeningJSON').disabled = false;
      document.getElementById('exportScreeningMarkdown').disabled = false;
      document.getElementById('copyTradingPairs').disabled = false;

      // Update status
      document.getElementById('lastScreeningTime').textContent = new Date(
        this.latestReport.generatedAt,
      ).toLocaleString();
      document.getElementById('projectsFound').textContent =
        this.latestReport.recommendations.length;
    } catch (error) {
      console.error('Failed to load latest report:', error);
    }
  }

  displayReport(report) {
    // Show results section
    document.getElementById('screeningResults').style.display = 'block';

    // Update statistics
    document.getElementById('sectorsAnalyzed').textContent = report.analyzedSectors.length;
    document.getElementById('projectsScreened').textContent = report.totalProjectsAnalyzed;
    document.getElementById('selectedSectorsCount').textContent = report.selectedSectors.length;
    document.getElementById('reportDate').textContent = new Date(
      report.generatedAt,
    ).toLocaleDateString();

    // Display project cards
    this.displayProjectCards(report.recommendations);

    // Display candidates table
    this.displayCandidatesTable(report.recommendations);

    // Display selected sectors
    this.displaySelectedSectors(report.selectedSectors);

    // Display macro risks
    this.displayMacroRisks(report.macroRisks);

    // Display next actions
    this.displayNextActions(report.nextActions);
  }

  displayProjectCards(recommendations) {
    const container = document.getElementById('projectCards');
    container.innerHTML = '';

    recommendations.forEach((project) => {
      const card = document.createElement('div');
      card.className = 'project-card';

      const riskClass =
        project.riskLevel === 'low'
          ? 'positive'
          : project.riskLevel === 'medium'
            ? 'neutral'
            : 'negative';

      card.innerHTML = `
        <div class="project-card-header">
          <div class="project-rank">🥇 #${project.rank}</div>
          <div class="project-title">
            <h4>${project.ticker} - ${project.name}</h4>
            <span class="project-sector">${project.sector || 'N/A'}</span>
          </div>
        </div>
        <div class="project-metrics">
          <div class="metric">
            <span class="metric-label">Score</span>
            <span class="metric-value">${project.score.toFixed(1)}/100</span>
          </div>
          <div class="metric">
            <span class="metric-label">Risk</span>
            <span class="metric-value ${riskClass}">${project.riskLevel}</span>
          </div>
        </div>
        <div class="project-rationale">
          <h5>📊 Rationale:</h5>
          <p>${project.rationale}</p>
        </div>
        <div class="project-risk">
          <h5>⚠️ Key Risk:</h5>
          <p>${project.keyRisk}</p>
        </div>
        <div class="project-pairs">
          <h5>💱 Trading Pairs:</h5>
          <ul>
            ${project.tradingPairs.map((pair) => `<li>${pair}</li>`).join('')}
          </ul>
        </div>
        <div class="project-stats">
          <div class="stat-item">
            <span>Market Cap:</span>
            <span>$${this.formatNumber(project.marketCap)}</span>
          </div>
          <div class="stat-item">
            <span>Volume 24h:</span>
            <span>$${this.formatNumber(project.volume24h)}</span>
          </div>
          <div class="stat-item">
            <span>Distance to ATH:</span>
            <span>${project.priceToAth.toFixed(1)}%</span>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  displayCandidatesTable(recommendations) {
    const tbody = document.getElementById('candidatesTableBody');
    tbody.innerHTML = '';

    recommendations.forEach((project) => {
      const row = document.createElement('tr');
      const riskClass =
        project.riskLevel === 'low'
          ? 'positive'
          : project.riskLevel === 'medium'
            ? 'neutral'
            : 'negative';

      row.innerHTML = `
        <td>${project.rank}</td>
        <td><strong>${project.ticker}</strong></td>
        <td>${project.name}</td>
        <td>${project.sector || 'N/A'}</td>
        <td>${project.score.toFixed(1)}</td>
        <td><span class="${riskClass}">${project.riskLevel}</span></td>
        <td>$${this.formatNumber(project.marketCap)}</td>
        <td>$${this.formatNumber(project.volume24h)}</td>
      `;

      tbody.appendChild(row);
    });
  }

  displaySelectedSectors(sectors) {
    const container = document.getElementById('selectedSectors');
    container.innerHTML = '';

    sectors.forEach((sector) => {
      const card = document.createElement('div');
      card.className = 'sector-card';

      card.innerHTML = `
        <h5>${sector.sector}</h5>
        <p class="sector-narrative">${sector.narrative}</p>
        <div class="sector-metrics">
          <div class="metric-item">
            <span>Score:</span>
            <span>${sector.score.toFixed(1)}</span>
          </div>
          <div class="metric-item">
            <span>30d Growth:</span>
            <span class="${sector.marketCapChange30d > 0 ? 'positive' : 'negative'}">
              ${sector.marketCapChange30d.toFixed(1)}%
            </span>
          </div>
          <div class="metric-item">
            <span>90d Growth:</span>
            <span class="${sector.marketCapChange90d > 0 ? 'positive' : 'negative'}">
              ${sector.marketCapChange90d.toFixed(1)}%
            </span>
          </div>
          <div class="metric-item">
            <span>Projects:</span>
            <span>${sector.projectCount}</span>
          </div>
        </div>
        <div class="sector-projects">
          <strong>Top Projects:</strong> ${sector.topProjects.join(', ')}
        </div>
      `;

      container.appendChild(card);
    });
  }

  displayMacroRisks(risks) {
    const container = document.getElementById('macroRisks');
    container.innerHTML = '';

    risks.forEach((risk) => {
      const item = document.createElement('div');
      item.className = 'risk-item';
      item.innerHTML = `<span class="risk-icon">⚠️</span> ${risk}`;
      container.appendChild(item);
    });
  }

  displayNextActions(actions) {
    const container = document.getElementById('nextActions');
    container.innerHTML = '';

    actions.forEach((action, index) => {
      const item = document.createElement('div');
      item.className = 'action-item';
      item.innerHTML = `
        <input type="checkbox" id="action${index}" />
        <label for="action${index}">${action}</label>
      `;
      container.appendChild(item);
    });
  }

  exportJSON() {
    if (!this.latestReport) return;

    const dataStr = JSON.stringify(this.latestReport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `screening-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportMarkdown() {
    if (!this.latestReport) return;

    const markdown = this.generateMarkdownReport(this.latestReport);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `screening-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateMarkdownReport(report) {
    let md = `# Cryptocurrency Screening Report\n\n`;
    md += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Sectors Analyzed:** ${report.analyzedSectors.join(', ')}\n`;
    md += `- **Total Projects Screened:** ${report.totalProjectsAnalyzed}\n`;
    md += `- **Recommended Projects:** ${report.recommendations.length}\n\n`;

    md += `## 📊 Recommended Projects\n\n`;
    report.recommendations.forEach((project) => {
      md += `### ${project.rank}. ${project.ticker} - ${project.name}\n\n`;
      md += `- **Sector:** ${project.sector || 'N/A'}\n`;
      md += `- **Score:** ${project.score.toFixed(1)}/100\n`;
      md += `- **Risk Level:** ${project.riskLevel}\n`;
      md += `- **Market Cap:** $${this.formatNumber(project.marketCap)}\n`;
      md += `- **Volume 24h:** $${this.formatNumber(project.volume24h)}\n\n`;
      md += `**Rationale:** ${project.rationale}\n\n`;
      md += `**Key Risk:** ${project.keyRisk}\n\n`;
      md += `**Trading Pairs:**\n`;
      project.tradingPairs.forEach((pair) => {
        md += `- ${pair}\n`;
      });
      md += `\n`;
    });

    md += `## 🌐 Selected Sectors\n\n`;
    report.selectedSectors.forEach((sector) => {
      md += `### ${sector.sector}\n\n`;
      md += `${sector.narrative}\n\n`;
      md += `- **Score:** ${sector.score.toFixed(1)}\n`;
      md += `- **30d Growth:** ${sector.marketCapChange30d.toFixed(1)}%\n`;
      md += `- **90d Growth:** ${sector.marketCapChange90d.toFixed(1)}%\n`;
      md += `- **Top Projects:** ${sector.topProjects.join(', ')}\n\n`;
    });

    md += `## ⚠️ Macro Risks\n\n`;
    report.macroRisks.forEach((risk) => {
      md += `- ${risk}\n`;
    });
    md += `\n`;

    md += `## ✅ Next Actions\n\n`;
    report.nextActions.forEach((action) => {
      md += `- [ ] ${action}\n`;
    });

    return md;
  }

  async copyTradingPairs() {
    if (!this.latestReport) return;

    const pairs = this.latestReport.tradingPairs.join('\n');

    try {
      await navigator.clipboard.writeText(pairs);
      alert('Trading pairs copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = pairs;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Trading pairs copied to clipboard!');
    }
  }

  formatNumber(num) {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    } else {
      return num.toFixed(2);
    }
  }
}

// Initialize screening manager when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.screeningManager = new ScreeningManager();
  });
} else {
  window.screeningManager = new ScreeningManager();
}
