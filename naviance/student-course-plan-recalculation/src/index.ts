import { IJobConfig, Job } from '@data-channels/dcSDK';
import { StudentCoursePlanRecalculation } from './StudentCoursePlanRecalculation';

interface IDataChannelsEvent {
  Job: IJobConfig;
  TaskToken: string;
}

export async function lambdaHandler(event: IDataChannelsEvent, context: any): Promise<{ status: string }> {
  const job = Job.fromConfig(event.Job);
  await job.init();
  const processor = new StudentCoursePlanRecalculation(job);
  await processor.handle(context.awsRequestId, event);
  console.log('job status', `${job.status} ${job.statusMessage}`);

  const response = {
    status: 'Work Done',
  };

  return response;
}
