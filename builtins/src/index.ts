import BuiltInRouter from "./Router";

export async function BuiltInHandler(event: any, context: any): Promise<any> {

    await BuiltInRouter.handleJobEvent(event, context.awsRequestId);

    const response = {
        status: "Work Done"
    };

    return response;
}
