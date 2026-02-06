import chalk from 'chalk';

const BRAND = chalk.hex('#ec3750');
const DIM = chalk.gray;
const BOLD = chalk.bold;

export const log = {
  banner() {
    const line = DIM('─'.repeat(56));
    console.log(line);
    console.log(
      BRAND.bold('  ██╗  ██╗ ██████╗███╗   ██╗')
    );
    console.log(
      BRAND.bold('  ██║  ██║██╔════╝████╗  ██║')
    );
    console.log(
      BRAND.bold('  ███████║██║     ██╔██╗ ██║')
    );
    console.log(
      BRAND.bold('  ██╔══██║██║     ██║╚██╗██║')
    );
    console.log(
      BRAND.bold('  ██║  ██║╚██████╗██║ ╚████║')
    );
    console.log(
      BRAND.bold('  ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═══╝')
    );
    console.log(
      `  ${DIM('HCNoticer')} ${chalk.white('— YSWS Event Monitor')}`
    );
    console.log(line);
    console.log();
  },

  info(msg: string) {
    console.log(`  ${chalk.cyan('i')} ${msg}`);
  },

  success(msg: string) {
    console.log(`  ${chalk.green('✓')} ${BOLD(msg)}`);
  },

  warn(msg: string) {
    console.log(`  ${chalk.yellow('!')} ${msg}`);
  },

  error(msg: string) {
    console.log(`  ${chalk.red('✗')} ${chalk.red(msg)}`);
  },

  event(name: string, status: string, deadline: string, category: string) {
    const statusColors: Record<string, chalk.Chalk> = {
      active: chalk.green,
      ended: chalk.red,
      draft: chalk.yellow,
    };
    const colorFn = statusColors[status] || chalk.gray;
    const statusTag = colorFn(`[${status.toUpperCase()}]`);
    const deadlineTag = deadline
      ? DIM(` — ${deadline}`)
      : '';
    console.log(
      `    ${BRAND('+')} ${BOLD(name)} ${statusTag}${deadlineTag} ${DIM(`(${category})`)}`
    );
  },

  category(label: string, count: number) {
    console.log();
    console.log(
      `  ${chalk.white.bold(label)} ${DIM(`(${count} new)`)}`
    );
    console.log(`  ${DIM('─'.repeat(40))}`);
  },

  summary(totalNew: number, totalTracked: number) {
    console.log();
    const sep = DIM('─'.repeat(56));
    console.log(sep);
    if (totalNew > 0) {
      console.log(
        `  ${BRAND.bold(`${totalNew}`)} new event${totalNew !== 1 ? 's' : ''} found  ${DIM('|')}  ${chalk.white(String(totalTracked))} total tracked`
      );
    } else {
      console.log(`  ${chalk.green('✓')} No new events — ${chalk.white(String(totalTracked))} events tracked`);
    }
    console.log(sep);
    console.log();
  },

  timestamp() {
    console.log(`  ${DIM(new Date().toISOString())}`);
    console.log();
  },

  elapsed(ms: number) {
    const secs = (ms / 1000).toFixed(2);
    console.log(`  ${DIM(`Done in ${secs}s (${Math.round(ms)}ms)`)}`);
    console.log();
  },
};
