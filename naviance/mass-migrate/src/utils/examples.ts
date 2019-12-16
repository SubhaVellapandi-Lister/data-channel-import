import Table from "cli-table3";

export function printExamples() {
    const infoTable = new Table({style: {head: ['green']}, head: ['Command', 'Example']});

    // tslint:disable: max-line-length
    const infoItems = [
        { "channel.findone [options] <configGuid>": "dchan channel.findone 082d5edc-035e-4aba-87cf-cb1e674f2f85" },
        { "ingress.findone [options] <configGuid>": "dchan ingress.findone 082d5edc-035e-4aba-87cf-cb1e674f2f85" },
        { "ingress.find [options] <top> <skip> <filter>": "dchan ingress.find 10 0 'name eq \"ingress\"'" },
        { "channel.find [options] <top> <skip> <filter>": "dchan channel.find 10 0 'name eq \"channel\"'" },
        { "ingress.delete <configGuid> <hard>": "dchan ingress.delete \"23c6b525-e289-486a-a482-6775480b9dbc\" false" },
        { "channel.delete <configGuid> <hard>": "dchan channel.delete \"23c6b525-e289-486a-a482-6775480b9dbc\" false" },
        { "channel.create [options] <createBody>": "dchan channel.create '{\"product\":\"product-channel\",\n \"name\":\"name-channel\",\"configType\":\"CHANNEL\",\"meta\" \n:{\"meta\":\"meta\"},\"tenant\":{\"guid\":\"d39ebeb6-752b-4184-9c21-81a712be4037\" \n,\"name\":\"TEST1\",\"hiid\":\"HIID1\"},\"flow\":[\"FLOW1\",\"FLOW2\",\"FLOW3\"],\n \"steps\":{\"step1\":{\"processor\":\"processor\",\"method\":\"method\",\n \"granularity\":\"granularity\",\"inputs\":[\"input1\",\"input2\",\"input3\"],\n \"outputs\":[\"output1\",\"output2\",\"output3\"],\"batchSize\":1000,\"sourceType\":\"sourceType\",\n \"parameters\":{\"parameter1\":\"parameter1\",\"parameter2\":\"parameter2\",\"parameter3\":\"parameter3\",\"parameter4\":\"parameter4\"},\"generatesLog\":false}}}'\n"},
        { "ingress.create [options] <createBody>": "dchan ingress.create '{\"author\":\"AUTHOR-TEST\",\"name\":\"ingress-config\",\"product\":\"product-name\",\"jobs\":[{\"name\":\"job-name\" \n,\"sources\":[{\"name\":\"source1\",\"s3\":{\"bucket\":\"bucket1\",\"key\":\"key1\"},\"mustBeNew\":true,\"mustBeChanged\":true},{\"name\":\"source2\" \n,\"s3\":{\"bucket\":\"bucket2\",\"key\":\"key2\"},\"mustBeNew\":false,\"mustBeChanged\":false}],\"sourceMode\":{\"type\":\"GROUP_ANY_OF\",\n \"waitForNewFiles\":true,\"waitMinutes\":10},\"channel\":{\"guid\":\"d38df302-a530-42fa-b7d8-3158a0424a43\",\n \"name\":\"NAME-TEST-TEST-author\",\"product\":\"PRODUCT-TEST-TEST-without-author\"},\"workspace\":{\"bucket\":\"bucket-name\"},\"cron\":\"any cron value\"}],\n \"rateLimit\":{\"limitName\":\"limitName\",\"jobsPerHour\":10000000,\"parallelJobs\":10000000}}'" },
        { "channel.update [options] <configGuid> <updateBody>": "dchan channel.update d24344bf-3eb1-4a55-abb6-6c9e1458dc8f '{\"product\":\"product-channel\",\n \"name\":\"name-channel\",\"configType\":\"CHANNEL\",\"meta\" \n:{\"meta\":\"meta\"},\"tenant\":{\"guid\":\"d39ebeb6-752b-4184-9c21-81a712be4037\" \n,\"name\":\"TEST1\",\"hiid\":\"HIID1\"},\"flow\":[\"FLOW1\",\"FLOW2\",\"FLOW3\"],\n \"steps\":{\"step1\":{\"processor\":\"processor\",\"method\":\"method\",\n \"granularity\":\"granularity\",\"inputs\":[\"input1\",\"input2\",\"input3\"],\n \"outputs\":[\"output1\",\"output2\",\"output3\"],\"batchSize\":1000,\"sourceType\":\"sourceType\",\n \"parameters\":{\"parameter1\":\"parameter1\",\"parameter2\":\"parameter2\",\"parameter3\":\"parameter3\",\"parameter4\":\"parameter4\"},\"generatesLog\":false}}}'\n"},
        { "ingress.update [options] <configGuid> <updateBody>": "dchan ingress.update d24344bf-3eb1-4a55-abb6-6c9e1458dc8f '{\"configType\":\"INGRESS\",\"author\":\"AUTHOR-TEST\",\n \"name\":\"ingress-test\",\"product\":\"product-test\",\"jobs\":[{\"name\": \n \"jobname-test\",\"sources\":[{\"name\":\"source14\",\"s3\":{\"bucket\":\"bucket1\",\"key\":\n \"key1\"},\"mustBeNew\":true,\"mustBeChanged\":true},{\"name\":\"source2\",\"s3\":{\"bucket\":\n \"bucket2\",\"key\":\"key2\"},\"mustBeNew\":false,\"mustBeChanged\":false}],\"sourceMode\":{\n \"type\":\"GROUP_ANY_OF\",\"waitForNewFiles\":true,\"waitMinutes\":10},\"channel\":{\n \"guid\":\"d38df302-a530-42fa-b7d8-3158a0424a43\",\"name\":\"NAME-TEST-TEST-author\",\"product\":\"PRODUCT\"},\n \"workspace\":{\"bucket\":\"bucket-name\"},\"cron\":\"any cron value\"}],\"rateLimit\" \n :{\"limitName\":\"limitName\",\"jobsPerHour\":10000000,\"parallelJobs\":10000000}}'" },
        { "job.findone [options] <jobGuid>": "dchan job.findone 082d5edc-035e-4aba-87cf-cb1e674f2f85" },
        { "job.find [options] <top> <skip> <filter>": "dchan job.find 10 0 'name eq \"jobname\"'" },
        { "job.delete <jobGuid> <hard>": "dchan job.delete 082d5edc-035e-4aba-87cf-cb1e674f2f85 false " },
        { "job.create [options] <createBody>": "dchan job.create ´{\"name\":\"job-name\",\"channel\":{\"product\":\"PRODUCT\",\"name\":\"CHANNELNAME\"},\"tenant\":{\"guid\":\"cee9b180-3096-4452-a6af-ccad53f48af2\"}}´" },
        { "job.update [options] <jobGuid> <updateBody>": "dchan job.update 082d5edc-035e-4aba-87cf-cb1e674f2f85 '{\"name\":\"job\",\"channel\":{\"product\":\"product-channel\",\n \"name\":\"name-channel\"},\"tenant\":{\"guid\":\"edebb248-5651-4f0e-930c-60d4fc11b726\"}}'" },
        { "tenant.findone [options] <tenantGuid>": "dchan tenant.findone ea316624-acd1-4d7f-8bca-2ec763e10c2c" },
        { "tenant.find [options] <top> <skip> <filter> <orderBy>": "dchan tenant.find 10 0 'name eq \"TEST\" ' ''" },
        { "tenant.delete <tenantGuid> <hard>": "dchan tenant.delete ea316624-acd1-4d7f-8bca-2ec763e10c2c false" },
        { "tenant.create [options] <createBody>": "dchan tenant.create '{\"name\":\"TEST\",\"hiid\":\"edebb248-5651-4f0e-930c-60d4fc11b726\",\"product\":\"productTest\"}'" },
        { "tenant.update [options] <tenantGuid> <updateBody>": "dchan tenant.update ea316624-acd1-4d7f-8bca-2ec763e10c2c '{\"name\":\"UPDATING_NAME\",\"hiid\":\"edebb248-5651-4f0e-930c-60d4fc11b726\"}'" },
        { 'tenant.user.findone [options] <tenantGuid> <tenantUserGuid>': 'dchan tenant.user.findone 52d931b6-f840-466b-b947-3586b3a6b538 75336c45-5025-421c-8970-8c74650cada7' },
        { 'tenant.user.find [options] <tenantGuid> <top> <skip> <filter> <orderBy>': 'dchan tenant.user.find 52d931b6-f840-466b-b947-3586b3a6b538 10 0 \'email eq demo.tenant.user@email.com\' \'\'' },
        { 'tenant.user.delete <tenantGuid> <tenantUserGuid>': 'dchan tenant.user.delete 52d931b6-f840-466b-b947-3586b3a6b538 75336c45-5025-421c-8970-8c74650cada7' },
        { 'tenant.user.create [options] <tenantGuid> <createBody>': 'dchan tenant.user.create 52d931b6-f840-466b-b947-3586b3a6b538 \'{ "username": "exampleUsername", "email": "example.username@example.com" }\'' },
        { 'tenant.user.update [options] <tenantGuid> <tenantUserGuid> <updateBody>': 'dchan tenant.user.update 52d931b6-f840-466b-b947-3586b3a6b538 75336c45-5025-421c-8970-8c74650cada7 \'{ "username": "newUsername" }\'' },
        { 'tenant.user.rotatepassword <tenantGuid> <tenantUserGuid>': 'dchan tenant.user.rotatepassword 52d931b6-f840-466b-b947-3586b3a6b538 75336c45-5025-421c-8970-8c74650cada7' }
    ];
    // @ts-ignore
    infoTable.push(...infoItems);
    console.log(infoTable.toString());
}
