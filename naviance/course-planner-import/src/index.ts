import { IJobConfig, Job } from '@data-channels/dcSDK';
import { CPImportProcessor } from './CPImportProcessor';

interface IDataChannelsEvent {
  Job: IJobConfig;
  TaskToken: string;
}

export async function lambdaHandler(event: IDataChannelsEvent, context: any): Promise<{ status: string }> {
  const job = Job.fromConfig(event.Job);
  await job.init();
  const processor = new CPImportProcessor(job);
  await processor.handle(context.awsRequestId, event);
  console.log('job status', `${job.status} ${job.statusMessage}`);

  const response = {
    status: 'Work Done',
  };

  return response;
}
