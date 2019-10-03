import BuiltInRouter from "./Router";

export async function BuiltInHandler(event: any): Promise<any> {

    await BuiltInRouter.handleJobEvent(event);

    const response = {
        status: "Work Done"
    };

    return response;
}
