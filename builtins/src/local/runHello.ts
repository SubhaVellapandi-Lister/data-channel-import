import { ConfigType, JobStatus, jobWithInlineChannel } from "@data-channels/dcSDK";
import { fileUrlsForJobExecution } from "@data-channels/dcSDK/dist/utils/fileUrls";
import { s3DownloadURL, s3UploadURL } from "@data-channels/dcSDK/dist/utils/s3";
import HelloWorld from "../processors/HelloWorld";

const helloJob = {
    guid: '1234567890-hello-world-dev',
    workspace: {
        bucket: 'data-channels-work-sandbox'
    },
    currentStep: 'hello',
    /* filesIn: [
        {
            name: "helloIn",
            s3: {
                bucket: 'data-channels-work-sandbox',
                key: 'cce.csv'
            }
        }
    ],
    filesOut: [
        {
            name: "helloOut",
            s3: {
                bucket: 'data-channels-work-sandbox',
                key: 'testing/helloOut.csv'
            }
        }
    ], */
    steps: {
        hello: {
            finished: false
        }
    }
};

const helloChannel = {
    flow: ['hello'], // , 'helloRow'],
    steps: {
        hello: {
            method: "hello",
            processor: "data-channels-BuiltInProcessor",
            granularity: "once",
            parameters: {
                someSecret: "${SSM:/data-channels/hello-secret}"
            }
        }/*,
        helloRow: {
            inputs: [
                "helloIn"
            ],
            method: "helloRow",
            outputs: [
                "helloOut"
            ],
            processor: "data-channels-BuiltInProcessor",
            granularity: "row"
        } */
    },
};

(async () => {

    /* helloJob.workspace['fileUrls'] = {
        helloTest_READ: await s3DownloadURL('data-channels-work-sandbox', 'cce.csv'),
        helloOut_WRITE: await s3UploadURL(
            'data-channels-work-sandbox', '1234567890-hello-world-dev/helloOut.output.csv'),
        helloOut_READ: await s3DownloadURL(
            'data-channels-work-sandbox', '1234567890-hello-world-dev/helloOut.output.csv'),
        helloOut_OUTPUT: await s3UploadURL(
            'data-channels-work-sandbox', 'testing/helloOut.csv')
    };*/

    const job = jobWithInlineChannel(helloJob, helloChannel);
    const jobConfig = job.rawConfig;
    const amendedChannelConfig = Object.assign({
        guid: '',
        name: '',
        author: '',
        detailsGuid: '',
        isDeleted: false,
        created: new Date(),
        isLatest: true,
        product: '',
        configType: ConfigType.CHANNEL
    }, helloChannel);

    jobConfig.inlineChannel = amendedChannelConfig;
    jobConfig.currentStep = null;
    // job.workspace!.fileUrls = await fileUrlsForJobExecution(jobConfig);
    // console.log(job.workspace!.fileUrls);
    const hello = new HelloWorld(job);
    await hello.processAll('localrun');
    console.log(JSON.stringify(hello.job, undefined, 2));

})();
