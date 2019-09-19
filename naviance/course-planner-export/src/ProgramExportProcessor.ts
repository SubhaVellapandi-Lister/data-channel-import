import { Namespace, Program, ProgramStatement, RulesRepository } from "@academic-planner/apSDK";
import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput,
    IStepAfterOutput,
    IStepBeforeInput
} from "@data-channels/dcSDK";
import { getSchools } from "./Schools";

export class ProgramExportProcessor extends BaseProcessor {
    private headers = [
        'Naviance_School_ID',
        'GUID',
        'Naviance_Program_ID',
        'Program_Name',
        'Type',
        'Author_ID',
        'Updated_Date',
        'Published',
        'Published_Date',
        'Published_Schools',
        'Class_Year_From',
        'Class_Year_To',
        'Active_Schools',
        'Total_Credits',

        'Requirement_Index',
        'Requirement_Name',
        'Requirement_Credits'
    ];
    private programsExported: { [schoolId: string]: number } = {};

    public async findSchools(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        RulesRepository.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['JWT'],
            product: input.parameters!['rulesRepoProduct']
        });
        const schools = await getSchools(input.parameters!['rulesRepoUrl'], input.parameters!['JWT']);

        return {
            results: {
                schools
            }
        };
    }

    public async before_export(input: IStepBeforeInput) {
        RulesRepository.init({
            url: input.parameters!['rulesRepoUrl'],
            jwt: input.parameters!['JWT'],
            product: input.parameters!['rulesRepoProduct']
        });
    }

    public async export(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        const schoolId = Object.keys(input.outputs)[0];

        this.writeOutputRow(input.outputs[schoolId].writeStream, this.headers);
        let programsExported = 0;

        function stringAnno(program: Program | ProgramStatement, annoName: string): string {
            if (!program.annotations || !program.annotations.getValue(annoName)) {
                return '';
            }

            const val = program.annotations.getValue(annoName)!.toString();

            return val === 'undefined' ? '' : val;
        }

        function listStringAnno(program: Program, annoName: string): string {
            const val = program.annotations.getValue(annoName);
            if (!val) {
                return  '';
            }

            return (val as string[]).join(',');
        }

        function booleanAnno(program: Program, annoName: string): string {
            return (program.annotations.getValue(annoName) || '') === 1 ? 'YES' : 'NO';
        }

        console.log(`processing school ${schoolId}`);
        const pager = Program.find(new Namespace(schoolId));

        console.log(`found ${await pager.total()} programs`);
        let page = await pager.page(1);
        while (page.length) {
            for await (const program of page) {
                programsExported += 1;

                const pubTimestampStr = stringAnno(program, 'lastPublished');
                const pubDate = pubTimestampStr ? new Date(parseInt(pubTimestampStr)).toISOString() : '';

                const rowData = {
                    Naviance_School_ID: schoolId,
                    GUID: program.guid,
                    Naviance_Program_ID: program.name,
                    Program_Name: stringAnno(program, 'name'),
                    Type: stringAnno(program, 'type'),
                    Author_ID: program.authorId,
                    Updated_Date: program.file.repoFile!.latestVersion!.created,
                    Published: booleanAnno(program, 'published'),
                    Published_Date: pubDate,
                    Published_Schools: listStringAnno(program, 'publishedSchools'),
                    Class_Year_From: stringAnno(program, 'classYearFrom'),
                    Class_Year_To: stringAnno(program, 'classYearTo'),
                    Active_Schools: listStringAnno(program, 'activeSchools'),
                };

                if (!program.statements) {
                    const flatRow = this.headers.map((headerName) => (rowData[headerName] || '').toString());
                    this.writeOutputRow(input.outputs[schoolId].writeStream, flatRow);
                } else {
                    let totalCredits = 0;
                    for (const stmt of program.statements) {
                        if (stmt.annotations && stmt.annotations.getValue('credits')) {
                            totalCredits += parseInt(stmt.annotations.getValue('credits')!.toString()) || 0;
                        }
                    }
                    for (const [idx, stmt] of program.statements.entries()) {
                        const reqRowData = Object.assign({
                            Total_Credits: totalCredits.toString(),
                            Requirement_Index: idx.toString(),
                            Requirement_Name: stringAnno(stmt, 'name'),
                            Requirement_Credits: stringAnno(stmt, 'credits')
                        }, rowData);
                        const flatRow = this.headers.map((headerName) => (reqRowData[headerName] || '').toString());
                        this.writeOutputRow(input.outputs[schoolId].writeStream, flatRow);
                    }
                }

                console.log(`${schoolId} - ${program.guid}`);
            }
            page = await pager.next();
        }

        this.programsExported[schoolId] = programsExported;

        return {};
    }

    public async after_export(input: IStepBeforeInput): Promise<IStepAfterOutput> {
        return { results: {
            programsExported: this.programsExported
        }};
    }
}
