import {
    Course,
    Namespace,
    PlanContext,
    PlannedCourse,
    PlanningEngine,
    Program,
    StudentPlan
} from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { initRulesRepo } from "./Utils";

export class PlanCreateProcessor extends BaseProcessor {
    private namespace = '';
    private programs: Program[] = [];
    private courses: Course[] = [];

    public async before_createPlans(input: IStepBeforeInput) {
        initRulesRepo(input.parameters!);
        PlanningEngine.init({
            url: input.parameters!['planningUrl'],
            jwt: input.parameters!['rulesRepoJWT']
        });
        this.namespace = input.parameters!['namespace'];
        const ns = new Namespace(this.namespace);
        this.programs = await Program.find(ns).all();
        this.courses = await Course.find(ns).all();
    }

    public async createPlans(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            return { outputs: {}};
        }

        const studentId = input.data['studentid'];

        const prog = this.programs[Math.floor(Math.random() * this.programs.length)];

        const course1 = this.courses[Math.floor(Math.random() * this.courses.length)];
        const course2 = this.courses[Math.floor(Math.random() * this.courses.length)];
        const course3 = this.courses[Math.floor(Math.random() * this.courses.length)];

        function pCourse(c: Course): PlannedCourse {
            return new PlannedCourse({
                number: c.name,
                unique: c.name,
                credits: c.annotations.getValue('credits') as number || 1.0
            });
        }

        const scope =  `naviance.${this.namespace}`;
        const ctx = new PlanContext([], { buildAlgorithm: 'MandatedOnly' }, {}, scope, undefined, studentId);
        const studentPlan = new StudentPlan(
            studentId, studentId, scope, [ctx], [prog], [pCourse(course1), pCourse(course2), pCourse(course3)]);
        const slimPlan = await studentPlan.save();
        const fullPlan = await slimPlan.getBuiltPlan();
        console.log(studentId, fullPlan.guid);

        return {
            outputs: {}
        };
    }
}
