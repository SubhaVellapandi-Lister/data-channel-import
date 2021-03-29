import {
    BaseProcessor,
    IRowProcessorInput,
    IRowProcessorOutput,
    IStepAfterInput,
    Job,
    Tenant
} from "@data-channels/dcSDK";
import fetch from "node-fetch";
import { getJWT, initServices } from "../Utils";

export class InitiateExportsProcessor extends BaseProcessor {
    private districtByHsId: { [hsId: string]: string } = {};

    public async initiateExports(input: IRowProcessorInput): Promise<IRowProcessorOutput> {
        if (input.index === 1) {
            return {
                outputs: {}
            };
        }

        const hsId = input.data['Id'].replace(/\s+/g, '');
        const dsId = input.data['DistrictId'].replace(/\s+/g, '');
        if (dsId) {
            this.districtByHsId[hsId] = dsId;
        }

        return {
            outputs: {}
        };
    }

    public async after_initiateExports(input: IStepAfterInput) {
        initServices(input.parameters!);
        let tenantIds: string[] = [];

        const oneDayAgo = new Date();
        const dayDiff = oneDayAgo.getDate() - 1;
        oneDayAgo.setDate(dayDiff);

        const sinceDate = input.parameters!['sinceDate'] ? new Date(input.parameters!['sinceDate']) : oneDayAgo
        const queueDetails = input.parameters!['queueDetails'];
        const enviro = input.parameters!['enviro'];
        const outputBucket = input.parameters!['outputBucket'];
        const parameterTenants = input.parameters!['tenants'];

        if (parameterTenants) {
            tenantIds = parameterTenants;
        } else {
            const hsIds = await this.getScopes(input.parameters!['planningUrl'], sinceDate);

            for (const hsId of hsIds) {
                if (this.districtByHsId[hsId] && !tenantIds.includes(this.districtByHsId[hsId])) {
                    tenantIds.push(this.districtByHsId[hsId]);
                } else if (!this.districtByHsId[hsId]) {
                    tenantIds.push(hsId);
                }
            }
        }

        let academicYear = new Date().getFullYear();
        if (new Date() <= new Date(`${academicYear}-07-15`)) {
            academicYear -= 1;
        }

        const guidByTenantId: { [key: string]: string } = {};

        for (const tenantId of tenantIds) {
            const tenantPage = Tenant.find({ findCriteria: { name: { operator: 'eq', value: tenantId }}});
            const tenants = await tenantPage.all();

            const job = await Job.newJob({
                name: `exportStudentCourseReports-auto-initiated-${tenantId}`,
                channel: {
                    product: 'naviance',
                    name: 'exportStudentCourseReports'
                },
                tenant: tenants.length ? tenants[0].reference : undefined,
                product: 'naviance',
                queueDetails,
                filesOut: [
                    {
                        name: 'CourseExport',
                        s3: {
                            bucket: outputBucket,
                            key: `courseDemand/${enviro.toLowerCase()}/planned_courses_${tenantId}.csv`
                        }
                    },
                    {
                        name: 'PlanExport',
                        s3: {
                            bucket: outputBucket,
                            key: `${enviro.toLowerCase()}/course_plans_${tenantId}.csv`
                        }
                    },
                    {
                        name: 'Courses',
                        s3: {
                            bucket: outputBucket,
                            key: `activeCourses/${enviro.toLowerCase()}/courses_${tenantId}.csv`
                        }
                    }
                ],
                parameters: {
                    all: {
                        parallelSchools: 8,
                        tenantId,
                        notGraduated: true,
                        exports: {
                            PlanExport: {
                                mode: "audit"
                            },
                            CourseExport: {
                                mode:"course",
                                academicYear,
                                academicYearOrGreater: true,
                                currentPlansOnly: true,
                                customHeaders: [
                                    "Highschool_ID","Highschool_Name","Student_ID","Class_Year","First_Name",
                                    "Last_Name","Student_Plan_ID","Plan_Type","Plan_Name","Grade","Alternate_Course",
                                    "Course_ID","Course_Name","Course_Subject","SCED_Code","CSSC_Code",
                                    "Course_Active","Is_Planned", "Target_Highschool_ID", "Instructional_Level"
                                ] // always add new columns at the end because big data expects it that way
                            }
                        }
                    }
                }

            }, true);
            guidByTenantId[tenantId] = job ? job.guid : 'ERROR';
        }

        return {
            results: {
                guidByTenantId
            }
        };
    }

    private async getScopes(rootUrl: string, cutoffDate?: Date): Promise<string[]> {
        const schoolIds: string[] = [];
        const JWT = await getJWT();
        let url = rootUrl + '/scopes/?plansOnly=true';
        if (cutoffDate) {
            url += `&sinceDate=${cutoffDate.getFullYear()}-${cutoffDate.getMonth() + 1}-${cutoffDate.getDate()}`;
        }
        const resp = await fetch(
            url, { headers: { Authorization: JWT }});

        const body = await resp.json();
        if (!cutoffDate) {
            return Object.keys(body)
                .map((scope: string) => scope.includes('naviance.') ? scope.replace('naviance.', '') : '')
                .filter((id) => id.length > 0);
        }
        for (const scope of Object.keys(body)) {
            const scopeDateStr = body[scope]['plansLastUpdate'];
            if (scopeDateStr) {
                const lastDate = new Date(scopeDateStr);
                if (lastDate > cutoffDate && scope.includes('naviance.')) {
                    schoolIds.push(scope.replace('naviance.', ''));
                }
            }
        }

        return schoolIds;
    }
}
