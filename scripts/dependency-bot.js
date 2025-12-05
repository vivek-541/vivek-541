// scripts/dependency-bot.js
const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

class DependencyBot {
  constructor() {
    this.outdatedPackages = [];
    this.vulnerabilities = [];
  }

  // Check for outdated packages
  async checkOutdated() {
    console.log('🔍 Checking for outdated packages...');
    
    try {
      const output = execSync('npm outdated --json', { encoding: 'utf8' });
      this.outdatedPackages = JSON.parse(output);
      
      console.log(`Found ${Object.keys(this.outdatedPackages).length} outdated packages`);
      return this.outdatedPackages;
    } catch (error) {
      // npm outdated exits with code 1 if there are outdated packages
      if (error.stdout) {
        this.outdatedPackages = JSON.parse(error.stdout);
        return this.outdatedPackages;
      }
      console.error('Error checking outdated packages:', error.message);
      return {};
    }
  }

  // Check for security vulnerabilities
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
      
      console.log(`Found ${this.vulnerabilities.length} vulnerabilities`);
      return this.vulnerabilities;
    } catch (error) {
      console.error('Error checking vulnerabilities:', error.message);
      return [];
    }
  }

  // Get package changelog from npm
  async getChangelog(packageName) {
    return new Promise((resolve) => {
      const url = `https://registry.npmjs.org/${packageName}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const pkg = JSON.parse(data);
            const repository = pkg.repository?.url || '';
            const homepage = pkg.homepage || '';
            
            resolve({
              repository: repository.replace('git+', '').replace('.git', ''),
              homepage,
              description: pkg.description || ''
            });
          } catch (error) {
            resolve({ repository: '', homepage: '', description: '' });
          }
        });
      }).on('error', () => {
        resolve({ repository: '', homepage: '', description: '' });
      });
    });
  }

  // Generate detailed update report
  async generateReport() {
    console.log('📝 Generating update report...');
    
    let report = '# 🤖 Dependency Update Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;

    // Security vulnerabilities section
    if (this.vulnerabilities.length > 0) {
      report += '## 🚨 Security Vulnerabilities\n\n';
      report += '| Package | Severity | Issue |\n';
      report += '|---------|----------|-------|\n';
      
      for (const vuln of this.vulnerabilities) {
        const issue = Array.isArray(vuln.via) ? vuln.via[0].title : vuln.via;
        report += `| ${vuln.package} | **${vuln.severity.toUpperCase()}** | ${issue} |\n`;
      }
      report += '\n';
    }

    // Outdated packages section
    if (Object.keys(this.outdatedPackages).length > 0) {
      report += '## 📦 Package Updates\n\n';
      report += '| Package | Current | Wanted | Latest | Type |\n';
      report += '|---------|---------|--------|--------|------|\n';
      
      for (const [pkg, info] of Object.entries(this.outdatedPackages)) {
        const changelog = await this.getChangelog(pkg);
        const type = info.type || 'dependencies';
        
        report += `| [${pkg}](${changelog.homepage || changelog.repository}) | ${info.current} | ${info.wanted} | ${info.latest} | ${type} |\n`;
      }
      report += '\n';
    }

    // Update recommendations
    report += '## 💡 Recommendations\n\n';
    
    if (this.vulnerabilities.length > 0) {
      report += '- ⚠️ **High priority**: Fix security vulnerabilities immediately\n';
    }
    
    const majorUpdates = Object.entries(this.outdatedPackages).filter(([_, info]) => {
      const currentMajor = parseInt(info.current.split('.')[0]);
      const latestMajor = parseInt(info.latest.split('.')[0]);
      return latestMajor > currentMajor;
    });
    
    if (majorUpdates.length > 0) {
      report += '- 🔥 **Breaking changes possible**: Review changelogs for major version updates\n';
    }
    
    report += '- ✅ Run tests after merging this PR\n';
    report += '- 📚 Check changelogs for breaking changes\n';
    
    report += '\n---\n';
    report += '*This PR was automatically created by Dependency Bot*\n';

    return report;
  }

  // Update packages
  async updatePackages(strategy = 'minor') {
    console.log(`📥 Updating packages (strategy: ${strategy})...`);
    
    try {
      if (strategy === 'all') {
        // Update all to latest
        execSync('npm update --save', { stdio: 'inherit' });
      } else if (strategy === 'security') {
        // Only fix vulnerabilities
        execSync('npm audit fix', { stdio: 'inherit' });
      } else {
        // Default: update within semver range
        execSync('npm update', { stdio: 'inherit' });
      }
      
      console.log('✅ Packages updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating packages:', error.message);
      return false;
    }
  }

  // Main execution
  async run() {
    console.log('🤖 Dependency Bot Starting...\n');
    
    // Check for updates
    await this.checkOutdated();
    await this.checkVulnerabilities();
    
    // Generate report
    const report = await this.generateReport();
    fs.writeFileSync('update-report.md', report);
    
    console.log('\n✅ Report generated: update-report.md');
    
    // Determine if updates are needed
    const needsUpdate = Object.keys(this.outdatedPackages).length > 0 || 
                        this.vulnerabilities.length > 0;
    
    if (needsUpdate) {
      console.log('\n📦 Updates available. Run update process...');
      
      // Prioritize security updates
      if (this.vulnerabilities.length > 0) {
        await this.updatePackages('security');
      }
      
      // Then update other packages
      if (Object.keys(this.outdatedPackages).length > 0) {
        await this.updatePackages('minor');
      }
      
      return true;
    } else {
      console.log('\n✨ All dependencies are up to date!');
      return false;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const bot = new DependencyBot();
  bot.run().then((hasUpdates) => {
    process.exit(0);  // Always exit successfully
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = DependencyBot;