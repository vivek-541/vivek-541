// Dependency Bot Script
const { execSync } = require('child_process');
const fs = require('fs');

class DependencyBot {
  constructor() {
    this.outdatedPackages = [];
    this.vulnerabilities = [];
  }

  async checkOutdated() {
    console.log('🔍 Checking for outdated packages...');
    try {
      const output = execSync('npm outdated --json', { encoding: 'utf8' });
      this.outdatedPackages = JSON.parse(output);
      return this.outdatedPackages;
    } catch (error) {
      if (error.stdout) {
        this.outdatedPackages = JSON.parse(error.stdout);
        return this.outdatedPackages;
      }
      return {};
    }
  }

  async checkVulnerabilities() {
    console.log('🔒 Checking for security vulnerabilities...');
    try {
      const output = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(output);
      
      if (audit.vulnerabilities) {
        this.vulnerabilities = Object.entries(audit.vulnerabilities)
          .filter(([_, info]) => info.severity !== 'info')
          .map(([pkg, info]) => ({
            package: pkg,
            severity: info.severity,
            via: info.via
          }));
      }
      return this.vulnerabilities;
    } catch (error) {
      return [];
    }
  }

  async generateReport() {
    console.log('📝 Generating update report...');
    
    let report = '# 🤖 Dependency Update Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;

    if (this.vulnerabilities.length > 0) {
      report += '## 🚨 Security Vulnerabilities\n\n';
      report += '| Package | Severity | Issue |\n';
      report += '|---------|----------|-------|\n';
      
      for (const vuln of this.vulnerabilities) {
        const issue = Array.isArray(vuln.via) ? vuln.via[0].title || 'Security issue' : vuln.via;
        report += `| ${vuln.package} | **${vuln.severity.toUpperCase()}** | ${issue} |\n`;
      }
      report += '\n';
    }

    if (Object.keys(this.outdatedPackages).length > 0) {
      report += '## 📦 Package Updates\n\n';
      report += '| Package | Current | Latest | Type |\n';
      report += '|---------|---------|--------|------|\n';
      
      for (const [pkg, info] of Object.entries(this.outdatedPackages)) {
        const type = info.type || 'dependencies';
        report += `| ${pkg} | ${info.current} | ${info.latest} | ${type} |\n`;
      }
      report += '\n';
    }

    report += '## 💡 Recommendations\n\n';
    if (this.vulnerabilities.length > 0) {
      report += '- ⚠️ **High priority**: Fix security vulnerabilities immediately\n';
    }
    report += '- ✅ Run tests after merging this PR\n';
    report += '- 📚 Check changelogs for breaking changes\n';
    report += '\n---\n';
    report += '*This PR was automatically created by Dependency Bot*\n';

    return report;
  }

  async updatePackages() {
    console.log('📥 Updating packages...');
    try {
      if (this.vulnerabilities.length > 0) {
        execSync('npm audit fix', { stdio: 'inherit' });
      }
      execSync('npm update', { stdio: 'inherit' });
      return true;
    } catch (error) {
      console.error('❌ Error updating packages:', error.message);
      return false;
    }
  }

  async run() {
    console.log('�� Dependency Bot Starting...\n');
    
    await this.checkOutdated();
    await this.checkVulnerabilities();
    
    const report = await this.generateReport();
    fs.writeFileSync('update-report.md', report);
    
    console.log('\n✅ Report generated: update-report.md');
    
    const needsUpdate = Object.keys(this.outdatedPackages).length > 0 || 
                        this.vulnerabilities.length > 0;
    
    if (needsUpdate) {
      console.log('\n📦 Updates available. Running update process...');
      await this.updatePackages();
      return true;
    } else {
      console.log('\n✨ All dependencies are up to date!');
      return false;
    }
  }
}

if (require.main === module) {
  const bot = new DependencyBot();
  bot.run().then((hasUpdates) => {
    // Always exit successfully - GitHub Actions will check output
    if (hasUpdates) {
      console.log('::set-output name=has_updates::true');
    }
    process.exit(0);  // Always exit with success
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = DependencyBot;
