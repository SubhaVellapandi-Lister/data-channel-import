const { execSync } = require('child_process');

const environments = {
    platsandbox1: {
        profile: 'plat-sandbox',
        region: 'us-east-1',
        bucket: 'ss-data-channels-processor-deployments-platsandbox',
        stack: 'ss-data-channels-builtin-processor'
    }
}

const enviro = process.argv.slice(2);
console.log(`Deploying enviro ${enviro}`);

if (!environments[enviro]) {
    console.error(`could not find enviro config`);
    process.exit(1);
}
const { profile, region, bucket, stack } = environments[enviro];

execSync('npm run build', { stdio: 'inherit' });
execSync('npx sam build --template-file template-platform.yml', { stdio: 'inherit' });
execSync(`npx sam package --output-template-file packaged.yml --s3-bucket ${bucket} --profile ${profile}`, { stdio: 'inherit' });
execSync(`npx sam deploy --template-file packaged.yml --stack-name ${stack} --capabilities CAPABILITY_IAM --region ${region} --profile ${profile}`)

