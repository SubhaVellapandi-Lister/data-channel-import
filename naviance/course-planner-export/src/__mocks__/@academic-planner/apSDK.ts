import 'jest';

const realSDK = jest.requireActual('@academic-planner/apSDK');
export const Namespace = realSDK.Namespace;
export const ProgramAudit = realSDK.ProgramAudit;
export const RulesRepository = realSDK.RulesRepository;
export const Annotations = realSDK.Annotations;
export const AnnotationOperator = realSDK.AnnotationOperator;

const realCourse = realSDK.Course;

export class Course {
    public static find(criteria: any): any {
        return {
            page: () => {
                return [
                    new realCourse('MyCourse101', 'A basic course', new Annotations({
                        test: {
                            operator: AnnotationOperator.EQUALS,
                            value: 'something'
                        }
                    })),
                    new realCourse('MyCourse102', 'Another course')
                ];
            },
            next: () => {
                return [];
            }
        };
    }
}
