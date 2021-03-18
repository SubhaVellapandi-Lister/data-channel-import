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
                        subjectArea: {
                            operator: AnnotationOperator.EQUALS,
                            value: 'something_999_999'
                        },
                        schools: {
                            operator: AnnotationOperator.EQUALS,
                            value: ['111','222']
                        }
                    })),
                    new realCourse('MyCourse102', 'Another course', new Annotations({
                        subjectArea: {
                            operator: AnnotationOperator.EQUALS,
                            value: 'something_999_999'
                        },
                        schools: {
                            operator: AnnotationOperator.EQUALS,
                            value: ['111','222']
                        }
                    }))
                ];
            },
            next: () => {
                return [];
            }
        };
    }
}

export class SlimStudentPlan extends realSDK.SlimStudentPlan {
    public get audits() {
        return this.summary.expanded.audits;
    }
}
