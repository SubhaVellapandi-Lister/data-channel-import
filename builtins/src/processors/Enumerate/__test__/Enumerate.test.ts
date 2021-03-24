import { getEnumerateProcessor, testEnumerateConfig } from "./EnumerateTestUtils";

describe("EnumerateProcessor", () => {
    afterAll(() => {
        jest.restoreAllMocks();
    });

    test("default config", async () => {
        const processor = getEnumerateProcessor();
        const headerOutput = await processor.enumerate({
            index: 1,
            name: 'input1',
            data: {
                somecol: 'somecol',
                anothercol: 'anothercol'
            },
            raw: [
                'somecol',
                'anothercol'
            ]
        });

        expect(headerOutput).toEqual({ outputs: { input1Enumerated: ['index', 'somecol', 'anothercol'] } });

        const rowOutput = await processor.enumerate({
            index: 2,
            name: 'input1',
            data: {
                somecol: 'someval',
                anothercol: 'anotherval'
            },
            raw: [
                'someval',
                'anotherval'
            ]
        });

        expect(rowOutput).toEqual({ outputs: { input1Enumerated: ['2', 'someval', 'anotherval'] } });
    });

    test("custom config", async () => {
        const processor = getEnumerateProcessor();
        await processor.before_enumerate({
            parameters: {
                enumerateConfig: testEnumerateConfig
            }
        });
        const headerOutput = await processor.enumerate({
            index: 1,
            name: 'input1',
            data: {
                somecol: 'somecol',
                anothercol: 'anothercol'
            },
            raw: [
                'somecol',
                'anothercol'
            ]
        });

        expect(headerOutput).toEqual({ outputs: { indexedInput: ['someIndex', 'somecol', 'anothercol'] } });

        const rowOutput = await processor.enumerate({
            index: 2,
            name: 'input1',
            data: {
                somecol: 'someval',
                anothercol: 'anotherval'
            },
            raw: [
                'someval',
                'anotherval'
            ]
        });

        expect(rowOutput).toEqual({ outputs: { indexedInput: ['2', 'someval', 'anotherval'] } });
    });
});
