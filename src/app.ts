import { Command } from 'commander';
import {
  connectToDatabase,
  disconnectFromDatabase,
  dropCollections,
  pingDatabase,
  seedDatabase,
} from './database';
import { config } from './config';
import * as Pkg from '../package.json';
import { Mongoose } from 'mongoose';
import { timeStamp } from 'console';
import { createHistogram } from 'perf_hooks';

export class App {
  private program: Command;
  private mongoose!: Mongoose;

  constructor() {
    this.program = new Command();

    this.program
      .name('rocc-client')
      .usage('[global options] command')
      .version(Pkg.version, '-v, --version', 'output the current version')
      .description(Pkg.description);

    this.program
      .command('ping')
      .description('ping the MongoDB instance')
      .action(() => this.ping())
      .hook('preAction', () => this.setConfig(this.program.opts()));

    this.program
      .command('remove-collections')
      .description('remove all collections')
      .action(() => this.removeCollections())
      .hook('preAction', () => this.setConfig(this.program.opts()));

    // this.program
    //   .command('seed')
    //   .description(
    //     'empty and seed the db with the JSON files from the directory specified'
    //   )
    //   .argument('<directory>')
    //   .action((directory: string) => this.seed(directory))
    //   .hook('preAction', () => this.setConfig(this.program.opts()));

    this.program
      .option('--uri <uri>', 'MongoDB uri', 'mongodb://localhost:27017/rocc')
      .option('--username <username>', 'MongoDB username', 'roccmongo')
      .option('--password <password>', 'MongoDB password', 'roccmongo');
  }

  public async gracefulShutdown(msg: string, callback: any): Promise<void> {
    console.log('gracefulShutdown');
    if (this.mongoose) {
      await this.mongoose.connection.close();
    }
    callback();
    return Promise.resolve();
  }

  private async ping(): Promise<void> {

    try {
      this.mongoose = await connectToDatabase();
      const pong = await pingDatabase();
      console.log(pong ? 'pong' : 'No pong received');
      return this.gracefulShutdown('', () => {
        process.exit(pong ? 0 : -1);
      });
    } catch (err) {
      console.error(err);
      return this.gracefulShutdown('', () => {
        process.exit(-1);
      });
    }
  }

  private async removeCollections(): Promise<void> {
    try {
      this.mongoose = await connectToDatabase();
      const success = await dropCollections();
      return this.gracefulShutdown('', () => {
        process.exit(success ? 0 : -1);
      });
    } catch (err) {
      console.error(err);
      return this.gracefulShutdown('', () => {
        process.exit(-1);
      });
    }
  }

  // private async seed(directory: string): Promise<void> {
  //   return connectToDatabase()
  //     .then(() => seedDatabase(directory))
  //     .then(() => process.exit(0))
  //     .catch((err: any) => {
  //       console.log(err);
  //       process.exit(-1);
  //     });
  // }

  private setConfig(options: any): void {
    config.mongo.uri = options.uri;
    config.mongo.options.user = options.username;
    config.mongo.options.pass = options.password;
  }

  public async run(): Promise<void> {
    await this.program.parseAsync(process.argv);
  }
}
