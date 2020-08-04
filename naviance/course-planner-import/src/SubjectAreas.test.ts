import {IProgramDetailed} from "@academic-planner/academic-planner-common";
import 'jest';
import {getCombinedSubjectArea} from "./SubjectAreas";

describe('SubjectAreas tests', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('getCombinedSubjectArea', async () => {
        // empty mapping
        let combined  = getCombinedSubjectArea('foo', '001', { subjectAreaMapping: {}}, '');
        expect(combined).toEqual('');
        // loaded mapping
        combined = getCombinedSubjectArea(
            'foo',
            '001',
            {
                subjectAreaMapping: {
                    foo: [
                        { scedCode: 1, csscCode: 2 }
                    ]
                }
            },
            ''
        );
        expect(combined).toEqual('foo_2_1');
    });
});
