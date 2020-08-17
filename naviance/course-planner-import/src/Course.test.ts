import {RulesRepository} from '@academic-planner/apSDK';
import 'jest';
import { CourseImport } from "./Course";

describe('CourseImport tests', () => {
  beforeAll(() => {
    jest.spyOn(RulesRepository, 'init');
    RulesRepository.init({} as any);
  });

  describe('courseFromRowData', () => {
    const rowData = {
      Recommendation_Required: 'Y',
      Repeatable: 'Y',
      Credit_Recovery: '1|2|3',
      Subject_Area: 'foo',
      SCED_Subject_Area: '001'
    };
    const subjAreaLoaded = {
      subjectAreaMapping: {
        foo: [
          { scedCode: 1, csscCode: 2 }
        ]
      }
    };

    it('imports csv data', () => {
      const result = CourseImport.courseFromRowData(rowData, 'foo', subjAreaLoaded, [] as any, undefined)!;
      expect(result?.annotations.getValue('permissionRequired')).toBe(1);
      expect(result?.annotations.getValue('repeatable')).toBe(1);
      expect(result?.statements.find((s) => s.kind === 'equivalent')).toMatchSnapshot();
    });

    it('imports other csv data', () => {
      const data = { ...rowData, Repeatable: 'N', Recommendation_Required: 'N' };
      const result = CourseImport.courseFromRowData(data, 'foo', subjAreaLoaded, [] as any, undefined)!;
      expect(result?.annotations.getValue('permissionRequired')).toBe(0);
      expect(result?.annotations.getValue('repeatable')).toBe(0);
    });

    it('imports fallback values', () => {
      const data = { ...rowData };
      delete data.Repeatable;
      delete data.Recommendation_Required;
      delete data.Credit_Recovery;
      const result = CourseImport.courseFromRowData(data, 'foo', subjAreaLoaded, [] as any, undefined)!;
      expect(result?.annotations.getValue('permissionRequired')).toBe(null);
      expect(result?.annotations.getValue('repeatable')).toBe(null);
      expect(result?.statements.find((s) => s.kind === 'equivalent')).toBe(undefined);
    });
  });
});
