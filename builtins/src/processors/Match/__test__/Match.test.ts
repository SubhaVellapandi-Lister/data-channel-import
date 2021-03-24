import { IRowProcessorOutput, Job, JobPager, SlimJob } from "@data-channels/dcSDK";
import _ from "lodash";

import { IMatchConfig } from "../Match.interface";

import {
    getMatchProcessor,
    testMatchConfig,
    testMatchConfigNoDup,
    testMatchConfigMultipleItems,
    testMatchConfigNoDupByType,
    inputRows
} from "./MatchTestUtils";

describe("MatchProcessor", () => {
    afterAll(() => {
        jest.restoreAllMocks();
    });

    test("student ID lookup", async () => {
        const processor = getMatchProcessor();
        await processor.before_matchFields({
            parameters: {
                matchConfig: testMatchConfig
            }
        });

        const lookupRows = inputRows('students', ['navStudentId', 'schoolStudentId', 'name'], [
            ['11111', '7', 'John Doe'],
            ['22222', '8', 'Jane Doe']
        ]);

        const sourceRows = inputRows('scores', ['studentId', 'score'], [
            ['8', '99'],
            ['8', '100'],
            ['9', '77']
        ]);

        const outputs: IRowProcessorOutput[] = [];

        for (const row of lookupRows.concat(sourceRows)) {
            outputs.push(await processor.matchFields(row));
        }

        expect(outputs[4]).toEqual({ outputs: { scoresMatched: ['22222', '99'] } });
        expect(outputs[5]).toEqual({ outputs: { scoresMatched: ['22222', '100'] } });
        expect(outputs[6]).toEqual({ outputs: { scoresUnmatched: ['9', '77'] } });
    });

    test("student ID lookup no duplicates allowed", async () => {
        const processor = getMatchProcessor();
        await processor.before_matchFields({
            parameters: {
                matchConfig: testMatchConfigNoDup
            }
        });

        const lookupRows = inputRows('students', ['navStudentId', 'schoolStudentId', 'name'], [
            ['11111', '7', 'John Doe'],
            ['22222', '8', 'Jane Doe']
        ]);

        const sourceRows = inputRows('scores', ['studentId', 'score'], [
            ['8', '99'],
            ['8', '100'],
            ['9', '77']
        ]);

        const outputs: IRowProcessorOutput[] = [];

        for (const row of lookupRows.concat(sourceRows)) {
            outputs.push(await processor.matchFields(row));
        }

        expect(outputs[4]).toEqual({ outputs: { scoresMatched: ['22222', '99'] } });
        expect(outputs[5]).toEqual({ outputs: { scoresMatchErrors: ['3', 'Duplicate lookup usage'] } });
        expect(outputs[6]).toEqual({ outputs: { scoresUnmatched: ['9', '77'] } });
    });

    test("student ID lookup multiple match types", async () => {
        const processor = getMatchProcessor();
        await processor.before_matchFields({
            parameters: {
                matchConfig: testMatchConfigMultipleItems
            }
        });

        const lookupRows = inputRows('students', ['navStudentId', 'schoolStudentId', 'name', 'birthdate'], [
            ['11111', '7', 'John Doe', '2000-01-01'],
            ['22222', '8', 'Jane Doe', '2000-12-31']
        ]);

        const sourceRows = inputRows('scores', ['studentId', 'name', 'birthdate', 'score'], [
            ['8', 'Jane Doe', '2000-12-31', '99'],
            ['0', 'Jane Doe', '2000-12-31', '100'],
            ['9', 'Bryan Doe', '2000-12-31', '77']
        ]);

        const outputs: IRowProcessorOutput[] = [];

        for (const row of lookupRows.concat(sourceRows)) {
            outputs.push(await processor.matchFields(row));
        }

        expect(outputs[4]).toEqual({ outputs: { scoresMatched: ['22222', 'Jane Doe', '2000-12-31', '99'] } });
        expect(outputs[5]).toEqual({ outputs: { scoresMatched: ['22222', 'Jane Doe', '2000-12-31', '100'] } });
        expect(outputs[6]).toEqual({ outputs: { scoresUnmatched: ['9', 'Bryan Doe', '2000-12-31', '77'] } });
    });

    test("student ID lookup multiple match types no duplicates allowed", async () => {
        const processor = getMatchProcessor();
        await processor.before_matchFields({
            parameters: {
                matchConfig: testMatchConfigNoDupByType
            }
        });

        const lookupRows = inputRows('students', ['navStudentId', 'schoolStudentId', 'name', 'birthdate'], [
            ['11111', '7', 'John Doe', '2000-01-01'],
            ['22222', '8', 'Jane Doe', '2000-12-31']
        ]);

        const sourceRows = inputRows('scores', ['studentId', 'name', 'birthdate', 'score'], [
            ['8', 'Jane Doe', '2000-12-31', '99'],
            ['8', 'Jane Doe', '2000-12-31', '47'],
            ['0', 'Jane Doe', '2000-12-31', '100'],
            ['9', 'Bryan Doe', '2000-12-31', '77']
        ]);

        const outputs: IRowProcessorOutput[] = [];

        for (const row of lookupRows.concat(sourceRows)) {
            outputs.push(await processor.matchFields(row));
        }

        expect(outputs[4]).toEqual({ outputs: { scoresMatched: ['22222', 'Jane Doe', '2000-12-31', '99'] } });
        expect(outputs[5]).toEqual({ outputs: { scoresMatched: ['22222', 'Jane Doe', '2000-12-31', '47'] } });
        expect(outputs[6]).toEqual({ outputs: { scoresMatchErrors: ['4', 'Duplicate lookup usage'] } });
        expect(outputs[7]).toEqual({ outputs: { scoresUnmatched: ['9', 'Bryan Doe', '2000-12-31', '77'] } });
    });
});
