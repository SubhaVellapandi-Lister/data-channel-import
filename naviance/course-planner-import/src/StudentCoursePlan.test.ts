// tslint:disable:max-line-length

import {PlanningEngine, Program, RulesRepository, SlimStudentPlan} from "@academic-planner/apSDK";

import {PlanImport} from "./StudentCoursePlan";

describe('test import plan', () => {
    test('import plan', async () => {

        const scope = "";
        const planObj = {};
        const programs = [fakeProgram];
        const createOnly = true;
        const existingPlans: SlimStudentPlan[] = [];
        const programNameMapping = {"CMHS Graduation Plan": "CMHS Four Year Course Plan"};
        for (const pObj of planObjs) {
            await PlanImport.importPlan(scope, pObj, programs, createOnly, existingPlans, programNameMapping, true);
        }
    });
    beforeAll(() => {
        RulesRepository.getInstance = jest.fn().mockReturnValue({getProduct: jest.fn()});
        // @ts-ignore
        fakeProgram = Program.fromChute(programChuteJson.latestVersion.contents.contents["64d3a249-99f5-4d47-a22a-85d60a6d06e1"]);
        fakeProgram.file.repoFile = programChuteJson;

    });
});
const programChuteJson = {
        namespace: "naviance.16199USPU.programs",
        name: "64d3a249-99f5-4d47-a22a-85d60a6d06e1",
        guid: "2334ff40-0b8f-4520-9e9a-1145499fe923",
        status: "active",
        meta: {
            activeSchools: [
                "16199USPU"
            ]
        },
        latestVersion: {
            fileGuid: "2334ff40-0b8f-4520-9e9a-1145499fe923",
            guid: "8fb00b5e-8722-41d4-8815-845d28cdc5ce",
            authorId: "fromSDK",
            latestVersion: true,
            catalogItemDefinitions: [
                {
                    name: "64d3a249-99f5-4d47-a22a-85d60a6d06e1",
                    type: "PROGRAM",
                    description: "CMHS Four Year Course Plan"
                }
            ],
            name: "64d3a249-99f5-4d47-a22a-85d60a6d06e1",
            namespace: "naviance.16199USPU.programs",
            status: "active",
            created: "2020-10-21T14:42:26.561Z",
            contents: {
                raw: "",
                contents: {
                    "64d3a249-99f5-4d47-a22a-85d60a6d06e1": {
                        name: "64d3a249-99f5-4d47-a22a-85d60a6d06e1",
                        type: "PROGRAM",
                        display: "CMHS Four Year Course Plan",
                        statements: [
                            {
                                take: {
                                    paren: {
                                        with: [
                                            {
                                                name: "nodeId",
                                                value: "YsGKWromXQ4",
                                                operator: "="
                                            }
                                        ],
                                        paren: {
                                            list: [
                                                {
                                                    list: [
                                                        {
                                                            id: "0030",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list0_list0"
                                                        },
                                                        {
                                                            id: "0070",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list0_list1"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 9,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "94011505-b423-497d-b3d5-c7857374abad",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "DP5zIYy7X0r",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 9,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list0"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "0040",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list1_list0"
                                                        },
                                                        {
                                                            id: "0089",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list1_list1"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 10,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "9a573cfb-3b2c-4398-b360-4b5c1ccaddd1",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "DKzHLPtStgf",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 10,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list1"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "0050",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list2_list0"
                                                        },
                                                        {
                                                            id: "0089",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list2_list1"
                                                        },
                                                        {
                                                            id: "0088",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list2_list2"
                                                        },
                                                        {
                                                            id: "0090",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list2_list3"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 11,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "36b53e22-793c-4bc5-b3d5-981642086c8e",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "2zvcTBtr9d0",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 11,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list2"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "0060",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list3_list0"
                                                        },
                                                        {
                                                            id: "0100",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list3_list1"
                                                        },
                                                        {
                                                            id: "0089",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list3_list2"
                                                        },
                                                        {
                                                            id: "0088",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list3_list3"
                                                        },
                                                        {
                                                            id: "PEN101/102",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list3_list4"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 12,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "ebbc1427-49e6-4292-92cc-29d593c85d39",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "CU1nXmrU5kD",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 12,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take_list3"
                                                }
                                            ],
                                            with: [
                                                {
                                                    name: "rule",
                                                    value: 2,
                                                    operator: "="
                                                },
                                                {
                                                    name: "nodeId",
                                                    value: "k6-P_UXudMx",
                                                    operator: "="
                                                }
                                            ],
                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take"
                                        },
                                        where: [
                                            {
                                                name: "credits",
                                                value: 4,
                                                operator: "="
                                            }
                                        ],
                                        embeddedList: true,
                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take"
                                    },
                                    amount: "all",
                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt0_take"
                                },
                                with: [
                                    {
                                        name: "id",
                                        value: "dfb2d04a-6c69-42b2-87a0-7f6ac0a6ca11",
                                        operator: "="
                                    },
                                    {
                                        name: "name",
                                        value: "English ",
                                        operator: "="
                                    },
                                    {
                                        name: "description",
                                        value: "<p>Students must earn <u><strong>four</strong></u> credits of English</p>",
                                        operator: "="
                                    },
                                    {
                                        name: "credits",
                                        value: 4,
                                        operator: "="
                                    },
                                    {
                                        name: "alternates",
                                        value: false,
                                        operator: "="
                                    },
                                    {
                                        name: "nodeId",
                                        value: "zrHU1cGRnj1",
                                        operator: "="
                                    }
                                ]
                            },
                            {
                                take: {
                                    paren: {
                                        with: [
                                            {
                                                name: "nodeId",
                                                value: "3oigAQjBV3H",
                                                operator: "="
                                            }
                                        ],
                                        paren: {
                                            list: [
                                                {
                                                    list: [
                                                        {
                                                            id: "1010",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list0_list0"
                                                        },
                                                        {
                                                            id: "1030",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list0_list1"
                                                        },
                                                        {
                                                            id: "1150",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list0_list2"
                                                        },
                                                        {
                                                            id: "1040",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list0_list3"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 9,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "4d837526-9926-4550-9070-d71b51b9112a",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "cR_2bm1DFdc",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 9,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list0"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "1140",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1_list0"
                                                        },
                                                        {
                                                            id: "1035",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1_list1"
                                                        },
                                                        {
                                                            id: "1150",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1_list2"
                                                        },
                                                        {
                                                            id: "1040",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1_list3"
                                                        },
                                                        {
                                                            id: "1050",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1_list4"
                                                        },
                                                        {
                                                            id: "1070",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1_list5"
                                                        },
                                                        {
                                                            id: "1080",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1_list6"
                                                        },
                                                        {
                                                            id: "1090",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1_list7"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 10,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "5e9d6287-4fbc-4450-a98d-674c968ce551",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "5HvOL0BCIXV",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 10,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list1"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "1050",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2_list0"
                                                        },
                                                        {
                                                            id: "1035",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2_list1"
                                                        },
                                                        {
                                                            id: "1040",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2_list2"
                                                        },
                                                        {
                                                            id: "1070",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2_list3"
                                                        },
                                                        {
                                                            id: "1160",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2_list4"
                                                        },
                                                        {
                                                            id: "1165",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2_list5"
                                                        },
                                                        {
                                                            id: "1080",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2_list6"
                                                        },
                                                        {
                                                            id: "1090",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2_list7"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 11,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "7e43e302-3a2e-45eb-927d-59f24870bf0a",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "tBEDIrGHzTF",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 11,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take_list2"
                                                }
                                            ],
                                            with: [
                                                {
                                                    name: "rule",
                                                    value: 2,
                                                    operator: "="
                                                },
                                                {
                                                    name: "nodeId",
                                                    value: "Q6XBaJGSaD_",
                                                    operator: "="
                                                }
                                            ],
                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take"
                                        },
                                        where: [
                                            {
                                                name: "credits",
                                                value: 3,
                                                operator: "="
                                            }
                                        ],
                                        embeddedList: true,
                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take"
                                    },
                                    amount: "all",
                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt1_take"
                                },
                                with: [
                                    {
                                        name: "id",
                                        value: "cadd151e-d3ab-47c9-9daf-b4d43f5dce1f",
                                        operator: "="
                                    },
                                    {
                                        name: "name",
                                        value: "Mathematics ",
                                        operator: "="
                                    },
                                    {
                                        name: "description",
                                        value: "<p>Students are required to take three credits of math. Four credits is recommended for college admissions.&nbsp;</p><p>Add fourth year math under elective credits&nbsp;</p>",
                                        operator: "="
                                    },
                                    {
                                        name: "credits",
                                        value: 3,
                                        operator: "="
                                    },
                                    {
                                        name: "alternates",
                                        value: false,
                                        operator: "="
                                    },
                                    {
                                        name: "nodeId",
                                        value: "Nacm81hVh1Q",
                                        operator: "="
                                    }
                                ]
                            },
                            {
                                take: {
                                    paren: {
                                        with: [
                                            {
                                                name: "nodeId",
                                                value: "gQAhapEH1yN",
                                                operator: "="
                                            }
                                        ],
                                        paren: {
                                            list: [
                                                {
                                                    list: [
                                                        {
                                                            id: "2155",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list0_list0"
                                                        },
                                                        {
                                                            id: "2020",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list0_list1"
                                                        },
                                                        {
                                                            id: "2100",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list0_list2"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 9,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "a7478ac8-ab60-4bbc-8d3d-80a908fd2673",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "srj-SeNgO7M",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 9,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list0"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "2090",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1_list0"
                                                        },
                                                        {
                                                            id: "2100",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1_list1"
                                                        },
                                                        {
                                                            id: "2125",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1_list2"
                                                        },
                                                        {
                                                            id: "2060",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1_list3"
                                                        },
                                                        {
                                                            id: "2110",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1_list4"
                                                        },
                                                        {
                                                            id: "2065",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1_list5"
                                                        },
                                                        {
                                                            id: "2175",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1_list6"
                                                        },
                                                        {
                                                            id: "2170",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1_list7"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 10,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "55645846-c55c-4deb-b1f7-69f73392e16e",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "Tl4CP9c80AK",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 10,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take_list1"
                                                }
                                            ],
                                            with: [
                                                {
                                                    name: "rule",
                                                    value: 2,
                                                    operator: "="
                                                },
                                                {
                                                    name: "nodeId",
                                                    value: "fwOYaoeSQ3o",
                                                    operator: "="
                                                }
                                            ],
                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take"
                                        },
                                        where: [
                                            {
                                                name: "credits",
                                                value: 2,
                                                operator: "="
                                            }
                                        ],
                                        embeddedList: true,
                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take"
                                    },
                                    amount: "all",
                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt2_take"
                                },
                                with: [
                                    {
                                        name: "id",
                                        value: "babbdbe5-d3e9-4c81-af43-99849ab08bc5",
                                        operator: "="
                                    },
                                    {
                                        name: "name",
                                        value: "Science",
                                        operator: "="
                                    },
                                    {
                                        name: "description",
                                        value: "<p>Students are required to complete two science credits.</p><p>Three credits are usually required for college admission. Add your 3rd year of science as an elective credit.&nbsp;</p>",
                                        operator: "="
                                    },
                                    {
                                        name: "credits",
                                        value: 2,
                                        operator: "="
                                    },
                                    {
                                        name: "alternates",
                                        value: false,
                                        operator: "="
                                    },
                                    {
                                        name: "nodeId",
                                        value: "mX7g9PAUhCt",
                                        operator: "="
                                    }
                                ]
                            },
                            {
                                take: {
                                    paren: {
                                        with: [
                                            {
                                                name: "nodeId",
                                                value: "090SAWqg-ft",
                                                operator: "="
                                            }
                                        ],
                                        paren: {
                                            list: [
                                                {
                                                    list: [
                                                        {
                                                            id: "3020",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take_list0_list0"
                                                        },
                                                        {
                                                            id: "3096",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take_list0_list1"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 9,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "7210a1ba-5df9-4934-861e-e5bf67890534",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "bCFOfu7s2uO",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 9,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take_list0"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "3090",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take_list1_list0"
                                                        },
                                                        {
                                                            id: "3110",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take_list1_list1"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 11,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "f13b3caf-f267-4d5f-bc80-478e01f06874",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "g43Isv9nfU2",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 11,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take_list1"
                                                }
                                            ],
                                            with: [
                                                {
                                                    name: "rule",
                                                    value: 2,
                                                    operator: "="
                                                },
                                                {
                                                    name: "nodeId",
                                                    value: "e-2W1rAJXDY",
                                                    operator: "="
                                                }
                                            ],
                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take"
                                        },
                                        where: [
                                            {
                                                name: "credits",
                                                value: 2,
                                                operator: "="
                                            }
                                        ],
                                        embeddedList: true,
                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take"
                                    },
                                    amount: "all",
                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt3_take"
                                },
                                with: [
                                    {
                                        name: "id",
                                        value: "cfad257d-f869-42cb-bc56-94b8896ea7c8",
                                        operator: "="
                                    },
                                    {
                                        name: "name",
                                        value: "Social Studies ",
                                        operator: "="
                                    },
                                    {
                                        name: "description",
                                        value: "<p>Students are required to have two credits of social studies completed, which must include US History.&nbsp;</p><p>Three credits are recommended for college admissions.&nbsp;</p>",
                                        operator: "="
                                    },
                                    {
                                        name: "credits",
                                        value: 2,
                                        operator: "="
                                    },
                                    {
                                        name: "alternates",
                                        value: false,
                                        operator: "="
                                    },
                                    {
                                        name: "nodeId",
                                        value: "2fxP-E7eAgD",
                                        operator: "="
                                    }
                                ]
                            },
                            {
                                take: {
                                    paren: {
                                        with: [
                                            {
                                                name: "nodeId",
                                                value: "gLygFMYL4pv",
                                                operator: "="
                                            }
                                        ],
                                        paren: {
                                            list: [
                                                {
                                                    list: [
                                                        {
                                                            id: "7055",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list0_list0"
                                                        },
                                                        {
                                                            id: "7076",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list0_list1"
                                                        },
                                                        {
                                                            id: "7091/92/94/97/98",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list0_list2"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 9,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "e010d90f-0d5f-407e-aba9-dabc2ea0e7e6",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "TjqjiKkoOP8",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 9,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list0"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "7010/7060",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list1_list0"
                                                        },
                                                        {
                                                            id: "7076",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list1_list1"
                                                        },
                                                        {
                                                            id: "7077",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list1_list2"
                                                        },
                                                        {
                                                            id: "7091/92/94/97/98",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list1_list3"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 10,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "ee33110c-64f2-40a8-98d3-a8a527239642",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "UGbeNUjs23Z",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 10,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list1"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "7010",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list2_list0"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 10,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "32faafbd-bb45-4e58-b36d-b3be25070d38",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "gBdPWd0jaC7",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 10,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list2"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "7036/7037",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3_list0"
                                                        },
                                                        {
                                                            id: "7038/7039",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3_list1"
                                                        },
                                                        {
                                                            id: "7041/7042",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3_list2"
                                                        },
                                                        {
                                                            id: "7040",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3_list3"
                                                        },
                                                        {
                                                            id: "7076",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3_list4"
                                                        },
                                                        {
                                                            id: "7077",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3_list5"
                                                        },
                                                        {
                                                            id: "7078",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3_list6"
                                                        },
                                                        {
                                                            id: "7091/92/94/97/98",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3_list7"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 11,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "97b1b365-83bd-428b-a603-054ad9da9894",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "TblakmNMrvu",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 11,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list3"
                                                },
                                                {
                                                    list: [
                                                        {
                                                            id: "7036/7037",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list0"
                                                        },
                                                        {
                                                            id: "7038/7039",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list1"
                                                        },
                                                        {
                                                            id: "7041/7042",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list2"
                                                        },
                                                        {
                                                            id: "7040",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list3"
                                                        },
                                                        {
                                                            id: "PPE101/PPE102",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list4"
                                                        },
                                                        {
                                                            id: "7076",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list5"
                                                        },
                                                        {
                                                            id: "7077",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list6"
                                                        },
                                                        {
                                                            id: "7078",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list7"
                                                        },
                                                        {
                                                            id: "7079",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list8"
                                                        },
                                                        {
                                                            id: "7091/92/94/97/98",
                                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4_list9"
                                                        }
                                                    ],
                                                    with: [
                                                        {
                                                            name: "grade",
                                                            value: 12,
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "shareGroup",
                                                            value: "31427df3-46c6-4ee2-81e5-3b74d99273d9",
                                                            operator: "="
                                                        },
                                                        {
                                                            name: "nodeId",
                                                            value: "73bnYlwx-Ru",
                                                            operator: "="
                                                        }
                                                    ],
                                                    where: [
                                                        {
                                                            name: "courses",
                                                            value: 1,
                                                            operator: "<="
                                                        },
                                                        {
                                                            name: "gradeLevel",
                                                            value: 12,
                                                            operator: "="
                                                        }
                                                    ],
                                                    hasParen: true,
                                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take_list4"
                                                }
                                            ],
                                            with: [
                                                {
                                                    name: "rule",
                                                    value: 2,
                                                    operator: "="
                                                },
                                                {
                                                    name: "nodeId",
                                                    value: "UwKPvyUEVT8",
                                                    operator: "="
                                                }
                                            ],
                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take"
                                        },
                                        where: [
                                            {
                                                name: "credits",
                                                value: 3.5,
                                                operator: "="
                                            }
                                        ],
                                        embeddedList: true,
                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take"
                                    },
                                    amount: "all",
                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt4_take"
                                },
                                with: [
                                    {
                                        name: "id",
                                        value: "82f625eb-b9c4-49a0-b0c7-f4c5a04339fb",
                                        operator: "="
                                    },
                                    {
                                        name: "name",
                                        value: "Physical Education/Dr.Ed or NJROTC",
                                        operator: "="
                                    },
                                    {
                                        name: "description",
                                        value: "<p>Students are required to earn 3.5 credits of PE or NJROTC, Which includes .25 credit for Dr. Ed.&nbsp;</p>",
                                        operator: "="
                                    },
                                    {
                                        name: "credits",
                                        value: 3.5,
                                        operator: "="
                                    },
                                    {
                                        name: "alternates",
                                        value: false,
                                        operator: "="
                                    },
                                    {
                                        name: "nodeId",
                                        value: "R6ZwiAJNhsp",
                                        operator: "="
                                    }
                                ]
                            },
                            {
                                take: {
                                    paren: {
                                        with: [
                                            {
                                                name: "nodeId",
                                                value: "0-Erh3Jsp2Y",
                                                operator: "="
                                            }
                                        ],
                                        paren: {
                                            with: [
                                                {
                                                    name: "rule",
                                                    value: 0,
                                                    operator: "="
                                                },
                                                {
                                                    name: "nodeId",
                                                    value: "238EPzKH6fM",
                                                    operator: "="
                                                }
                                            ],
                                            paren: {
                                                id: "7027",
                                                with: [
                                                    {
                                                        name: "grade",
                                                        value: 9,
                                                        operator: "="
                                                    },
                                                    {
                                                        name: "mandated",
                                                        value: true,
                                                        operator: "="
                                                    },
                                                    {
                                                        name: "shareGroup",
                                                        value: "f295776b-f7c6-4691-8a26-e29d5434ff4c",
                                                        operator: "="
                                                    }
                                                ],
                                                where: [
                                                    {
                                                        name: "gradeLevel",
                                                        value: 9,
                                                        operator: "="
                                                    }
                                                ],
                                                statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt5_take"
                                            },
                                            embeddedList: true,
                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt5_take"
                                        },
                                        where: [
                                            {
                                                name: "credits",
                                                value: 0.5,
                                                operator: "="
                                            }
                                        ],
                                        embeddedList: true,
                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt5_take"
                                    },
                                    amount: "all",
                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt5_take"
                                },
                                with: [
                                    {
                                        name: "id",
                                        value: "0ebc043a-141d-4672-a515-c44d6fa68f9e",
                                        operator: "="
                                    },
                                    {
                                        name: "name",
                                        value: "Health",
                                        operator: "="
                                    },
                                    {
                                        name: "description",
                                        value: "<p>Students are required to earn .5 credits of Health&nbsp;</p>",
                                        operator: "="
                                    },
                                    {
                                        name: "credits",
                                        value: 0.5,
                                        operator: "="
                                    },
                                    {
                                        name: "alternates",
                                        value: false,
                                        operator: "="
                                    },
                                    {
                                        name: "nodeId",
                                        value: "tyEzL8yPpWo",
                                        operator: "="
                                    }
                                ]
                            },
                            {
                                take: {
                                    paren: {
                                        with: [
                                            {
                                                name: "nodeId",
                                                value: "nR52f_c6ehn",
                                                operator: "="
                                            }
                                        ],
                                        paren: {
                                            with: [
                                                {
                                                    name: "rule",
                                                    value: 3,
                                                    operator: "="
                                                },
                                                {
                                                    name: "nodeId",
                                                    value: "765GEyGdf3S",
                                                    operator: "="
                                                }
                                            ],
                                            paren: {
                                                list: [
                                                    {
                                                        id: "6110",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list0"
                                                    },
                                                    {
                                                        id: "6190",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list1"
                                                    },
                                                    {
                                                        id: "6051",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list2"
                                                    },
                                                    {
                                                        id: "6055",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list3"
                                                    },
                                                    {
                                                        id: "6070",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list4"
                                                    },
                                                    {
                                                        id: "651/6153",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list5"
                                                    },
                                                    {
                                                        id: "6152/6153",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list6"
                                                    },
                                                    {
                                                        id: "8232",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list7"
                                                    },
                                                    {
                                                        id: "6131",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list8"
                                                    },
                                                    {
                                                        id: "6132",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list9"
                                                    },
                                                    {
                                                        id: "6185",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list10"
                                                    },
                                                    {
                                                        id: "6140",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list11"
                                                    },
                                                    {
                                                        id: "6145",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list12"
                                                    },
                                                    {
                                                        id: "6170",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list13"
                                                    },
                                                    {
                                                        id: "8214",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list14"
                                                    },
                                                    {
                                                        id: "6100",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list15"
                                                    },
                                                    {
                                                        id: "4005",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list16"
                                                    },
                                                    {
                                                        id: "6056",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list17"
                                                    },
                                                    {
                                                        id: "6090",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list18"
                                                    },
                                                    {
                                                        id: "5052",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list19"
                                                    },
                                                    {
                                                        id: "5110",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list20"
                                                    },
                                                    {
                                                        id: "5005",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list21"
                                                    },
                                                    {
                                                        id: "5020",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list22"
                                                    },
                                                    {
                                                        id: "5045",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list23"
                                                    },
                                                    {
                                                        id: "5105",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list24"
                                                    },
                                                    {
                                                        id: "0150",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list25"
                                                    },
                                                    {
                                                        id: "5040",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list26"
                                                    },
                                                    {
                                                        id: "5115",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list27"
                                                    },
                                                    {
                                                        id: "5070",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list28"
                                                    },
                                                    {
                                                        id: "5106",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list29"
                                                    },
                                                    {
                                                        id: "5140",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list30"
                                                    },
                                                    {
                                                        id: "5060",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list31"
                                                    },
                                                    {
                                                        id: "5062",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list32"
                                                    },
                                                    {
                                                        id: "4090",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list33"
                                                    },
                                                    {
                                                        id: "4093",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list34"
                                                    },
                                                    {
                                                        id: "4094",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list35"
                                                    },
                                                    {
                                                        id: "4095",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list36"
                                                    },
                                                    {
                                                        id: "4050",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list37"
                                                    },
                                                    {
                                                        id: "4070",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list38"
                                                    },
                                                    {
                                                        id: "4075",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take_list39"
                                                    }
                                                ],
                                                with: [
                                                    {
                                                        name: "shareGroup",
                                                        value: "e2652ce6-1994-4306-9d4f-dff7988db8cd",
                                                        operator: "="
                                                    },
                                                    {
                                                        name: "nodeId",
                                                        value: "EnAoU1280Lv",
                                                        operator: "="
                                                    }
                                                ],
                                                where: [
                                                    {
                                                        name: "credits",
                                                        value: 2,
                                                        operator: "="
                                                    }
                                                ],
                                                statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take"
                                            },
                                            embeddedList: true,
                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take"
                                        },
                                        where: [
                                            {
                                                name: "credits",
                                                value: 2,
                                                operator: "="
                                            }
                                        ],
                                        embeddedList: true,
                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take"
                                    },
                                    amount: "all",
                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt6_take"
                                },
                                with: [
                                    {
                                        name: "id",
                                        value: "d5cc3c79-dd0c-477e-9fa0-c7b857294bcd",
                                        operator: "="
                                    },
                                    {
                                        name: "name",
                                        value: "Fine Art/Career Tech/Foreign Language ",
                                        operator: "="
                                    },
                                    {
                                        name: "description",
                                        value: "<p>Students must had <u><strong>two </strong></u>credits within the fine arts, career tech, or foreign language.&nbsp;</p><p>*Foreign language is encouraged for college admission&nbsp;</p>",
                                        operator: "="
                                    },
                                    {
                                        name: "credits",
                                        value: 2,
                                        operator: "="
                                    },
                                    {
                                        name: "alternates",
                                        value: false,
                                        operator: "="
                                    },
                                    {
                                        name: "nodeId",
                                        value: "Jp1ptXKafPu",
                                        operator: "="
                                    }
                                ]
                            },
                            {
                                take: {
                                    paren: {
                                        with: [
                                            {
                                                name: "nodeId",
                                                value: "i7nItYAW7ty",
                                                operator: "="
                                            }
                                        ],
                                        paren: {
                                            with: [
                                                {
                                                    name: "rule",
                                                    value: 3,
                                                    operator: "="
                                                },
                                                {
                                                    name: "nodeId",
                                                    value: "IFndov6_rhU",
                                                    operator: "="
                                                }
                                            ],
                                            paren: {
                                                list: [
                                                    {
                                                        id: "6110",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list0"
                                                    },
                                                    {
                                                        id: "6190",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list1"
                                                    },
                                                    {
                                                        id: "6051",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list2"
                                                    },
                                                    {
                                                        id: "6055",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list3"
                                                    },
                                                    {
                                                        id: "6070",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list4"
                                                    },
                                                    {
                                                        id: "651/6153",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list5"
                                                    },
                                                    {
                                                        id: "6152/6153",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list6"
                                                    },
                                                    {
                                                        id: "8232",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list7"
                                                    },
                                                    {
                                                        id: "6131",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list8"
                                                    },
                                                    {
                                                        id: "6132",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list9"
                                                    },
                                                    {
                                                        id: "6185",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list10"
                                                    },
                                                    {
                                                        id: "6140",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list11"
                                                    },
                                                    {
                                                        id: "6145",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list12"
                                                    },
                                                    {
                                                        id: "6170",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list13"
                                                    },
                                                    {
                                                        id: "8214",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list14"
                                                    },
                                                    {
                                                        id: "6100",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list15"
                                                    },
                                                    {
                                                        id: "4005",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list16"
                                                    },
                                                    {
                                                        id: "6056",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list17"
                                                    },
                                                    {
                                                        id: "6090",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list18"
                                                    },
                                                    {
                                                        id: "5052",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list19"
                                                    },
                                                    {
                                                        id: "5110",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list20"
                                                    },
                                                    {
                                                        id: "5005",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list21"
                                                    },
                                                    {
                                                        id: "5020",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list22"
                                                    },
                                                    {
                                                        id: "5045",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list23"
                                                    },
                                                    {
                                                        id: "5105",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list24"
                                                    },
                                                    {
                                                        id: "0150",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list25"
                                                    },
                                                    {
                                                        id: "5040",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list26"
                                                    },
                                                    {
                                                        id: "5115",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list27"
                                                    },
                                                    {
                                                        id: "5070",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list28"
                                                    },
                                                    {
                                                        id: "5106",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list29"
                                                    },
                                                    {
                                                        id: "5140",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list30"
                                                    },
                                                    {
                                                        id: "5060",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list31"
                                                    },
                                                    {
                                                        id: "5062",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list32"
                                                    },
                                                    {
                                                        id: "4090",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list33"
                                                    },
                                                    {
                                                        id: "4093",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list34"
                                                    },
                                                    {
                                                        id: "4094",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list35"
                                                    },
                                                    {
                                                        id: "4095",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list36"
                                                    },
                                                    {
                                                        id: "4050",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list37"
                                                    },
                                                    {
                                                        id: "4070",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list38"
                                                    },
                                                    {
                                                        id: "4075",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list39"
                                                    },
                                                    {
                                                        id: "0110",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list40"
                                                    },
                                                    {
                                                        id: "8560",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list41"
                                                    },
                                                    {
                                                        id: "8561",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list42"
                                                    },
                                                    {
                                                        id: "0039",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list43"
                                                    },
                                                    {
                                                        id: "0034",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list44"
                                                    },
                                                    {
                                                        id: "0185",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list45"
                                                    },
                                                    {
                                                        id: "KCDI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list46"
                                                    },
                                                    {
                                                        id: "KCDII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list47"
                                                    },
                                                    {
                                                        id: "KCTI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list48"
                                                    },
                                                    {
                                                        id: "KCOSI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list49"
                                                    },
                                                    {
                                                        id: "KCOSII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list50"
                                                    },
                                                    {
                                                        id: "KFRI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list51"
                                                    },
                                                    {
                                                        id: "KHOI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list52"
                                                    },
                                                    {
                                                        id: "KHOII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list53"
                                                    },
                                                    {
                                                        id: "KLEI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list54"
                                                    },
                                                    {
                                                        id: "KLEII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list55"
                                                    },
                                                    {
                                                        id: "KWLDI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list56"
                                                    },
                                                    {
                                                        id: "KAUTOII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list57"
                                                    },
                                                    {
                                                        id: "KCOLLI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list58"
                                                    },
                                                    {
                                                        id: "KCOLLII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list59"
                                                    },
                                                    {
                                                        id: "KCOMPI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list60"
                                                    },
                                                    {
                                                        id: "KCOMPII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list61"
                                                    },
                                                    {
                                                        id: "KCTII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list62"
                                                    },
                                                    {
                                                        id: "KD3DDI",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list63"
                                                    },
                                                    {
                                                        id: "KD3DDII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list64"
                                                    },
                                                    {
                                                        id: "KFRII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list65"
                                                    },
                                                    {
                                                        id: "KWLDII",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list66"
                                                    },
                                                    {
                                                        id: "2139",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list67"
                                                    },
                                                    {
                                                        id: "2191",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list68"
                                                    },
                                                    {
                                                        id: "2192",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list69"
                                                    },
                                                    {
                                                        id: "2190",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list70"
                                                    },
                                                    {
                                                        id: "PBI100",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list71"
                                                    },
                                                    {
                                                        id: "PBI111",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list72"
                                                    },
                                                    {
                                                        id: "PCOMM101",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list73"
                                                    },
                                                    {
                                                        id: "PB221",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list74"
                                                    },
                                                    {
                                                        id: "PPS101",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list75"
                                                    },
                                                    {
                                                        id: "PSO101",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list76"
                                                    },
                                                    {
                                                        id: "PMT095",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list77"
                                                    },
                                                    {
                                                        id: "PMT096",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list78"
                                                    },
                                                    {
                                                        id: "PMT112",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list79"
                                                    },
                                                    {
                                                        id: "PMT115",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list80"
                                                    },
                                                    {
                                                        id: "PMT151",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list81"
                                                    },
                                                    {
                                                        id: "PMT153",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list82"
                                                    },
                                                    {
                                                        id: "PMT157",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list83"
                                                    },
                                                    {
                                                        id: "PMT165",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list84"
                                                    },
                                                    {
                                                        id: "PMT171",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list85"
                                                    },
                                                    {
                                                        id: "PMT172",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list86"
                                                    },
                                                    {
                                                        id: "PMU130",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list87"
                                                    },
                                                    {
                                                        id: "PHI112",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list88"
                                                    },
                                                    {
                                                        id: "0038",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list89"
                                                    },
                                                    {
                                                        id: "0035",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list90"
                                                    },
                                                    {
                                                        id: "1080",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list91"
                                                    },
                                                    {
                                                        id: "1090",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list92"
                                                    },
                                                    {
                                                        id: "1185",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list93"
                                                    },
                                                    {
                                                        id: "1160",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list94"
                                                    },
                                                    {
                                                        id: "1055",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list95"
                                                    },
                                                    {
                                                        id: "1056",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list96"
                                                    },
                                                    {
                                                        id: "8005",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list97"
                                                    },
                                                    {
                                                        id: "1191/PMT115",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list98"
                                                    },
                                                    {
                                                        id: "1190",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list99"
                                                    },
                                                    {
                                                        id: "1165",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list100"
                                                    },
                                                    {
                                                        id: "1070",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list101"
                                                    },
                                                    {
                                                        id: "2060",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list102"
                                                    },
                                                    {
                                                        id: "2110",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list103"
                                                    },
                                                    {
                                                        id: "2065",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list104"
                                                    },
                                                    {
                                                        id: "2175",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list105"
                                                    },
                                                    {
                                                        id: "2080",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list106"
                                                    },
                                                    {
                                                        id: "2125",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list107"
                                                    },
                                                    {
                                                        id: "2170",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list108"
                                                    },
                                                    {
                                                        id: "3150",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list109"
                                                    },
                                                    {
                                                        id: "3080",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list110"
                                                    },
                                                    {
                                                        id: "3035",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list111"
                                                    },
                                                    {
                                                        id: "3145",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list112"
                                                    },
                                                    {
                                                        id: "3096",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list113"
                                                    },
                                                    {
                                                        id: "3065",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list114"
                                                    },
                                                    {
                                                        id: "3030",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list115"
                                                    },
                                                    {
                                                        id: "3075",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list116"
                                                    },
                                                    {
                                                        id: "3152",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list117"
                                                    },
                                                    {
                                                        id: "3200",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list118"
                                                    },
                                                    {
                                                        id: "3140",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list119"
                                                    },
                                                    {
                                                        id: "3055",
                                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take_list120"
                                                    }
                                                ],
                                                with: [
                                                    {
                                                        name: "shareGroup",
                                                        value: "034a982a-b34b-4805-a7c3-dbf4dd0f12ee",
                                                        operator: "="
                                                    },
                                                    {
                                                        name: "nodeId",
                                                        value: "pN5yott8QXY",
                                                        operator: "="
                                                    }
                                                ],
                                                where: [
                                                    {
                                                        name: "credits",
                                                        value: 5,
                                                        operator: "="
                                                    }
                                                ],
                                                statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take"
                                            },
                                            embeddedList: true,
                                            statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take"
                                        },
                                        where: [
                                            {
                                                name: "credits",
                                                value: 5,
                                                operator: "="
                                            }
                                        ],
                                        embeddedList: true,
                                        statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take"
                                    },
                                    amount: "all",
                                    statementUnique: "64d3a249-99f5-4d47-a22a-85d60a6d06e1_stmt7_take"
                                },
                                with: [
                                    {
                                        name: "id",
                                        value: "c48a46ec-de93-4720-8b97-661bb0d67787",
                                        operator: "="
                                    },
                                    {
                                        name: "name",
                                        value: "Electives",
                                        operator: "="
                                    },
                                    {
                                        name: "description",
                                        value: "<p>Students must have <u><strong>five</strong></u> elective credits completed.&nbsp;</p><p>Any subject can be considered an elective.</p>",
                                        operator: "="
                                    },
                                    {
                                        name: "credits",
                                        value: 5,
                                        operator: "="
                                    },
                                    {
                                        name: "alternates",
                                        value: false,
                                        operator: "="
                                    },
                                    {
                                        name: "nodeId",
                                        value: "7Svp6te4otL",
                                        operator: "="
                                    }
                                ]
                            }
                        ],
                        annotations: {
                            guid: {
                                value: "2334ff40-0b8f-4520-9e9a-1145499fe923",
                                operator: "=",
                                annotationId: "STRING"
                            },
                            name: {
                                value: "CMHS Four Year Course Plan",
                                operator: "=",
                                annotationId: "STRING"
                            },
                            type: {
                                value: 0,
                                operator: "=",
                                annotationId: "DECIMAL"
                            },
                            lastSaved: {
                                value: 1603305746143,
                                operator: "=",
                                annotationId: "DECIMAL"
                            },
                            published: {
                                value: 0,
                                operator: "=",
                                annotationId: "BOOLEAN"
                            },
                            classYearTo: {
                                value: 2032,
                                operator: "=",
                                annotationId: "DECIMAL"
                            },
                            description: {
                                value: "<p>Students course plan must include minimally 22 credits.&nbsp;</p>",
                                operator: "=",
                                annotationId: "STRING"
                            },
                            activeSchools: {
                                value: [
                                    "16199USPU"
                                ],
                                operator: "=",
                                annotationId: "LIST_STRING"
                            },
                            classYearFrom: {
                                value: 2021,
                                operator: "=",
                                annotationId: "DECIMAL"
                            },
                            lastPublished: {
                                value: 1603305746143,
                                operator: "=",
                                annotationId: "DECIMAL"
                            },
                            checkedSchools: {
                                value: [
                                    "16199USPU"
                                ],
                                operator: "=",
                                annotationId: "LIST_STRING"
                            },
                            checkedToPublish: {
                                value: 0,
                                operator: "=",
                                annotationId: "BOOLEAN"
                            },
                            publishedSchools: {
                                value: [
                                    "16199USPU"
                                ],
                                operator: "=",
                                annotationId: "LIST_STRING"
                            },
                            publishedVersion: {
                                value: 1,
                                operator: "=",
                                annotationId: "BOOLEAN"
                            },
                            alternatesRequired: {
                                value: 0,
                                operator: "=",
                                annotationId: "BOOLEAN"
                            },
                            descriptionPlainText: {
                                value: "Students course plan must include minimally 22 credits. ",
                                operator: "=",
                                annotationId: "STRING"
                            }
                        }
                    }
                },
                namespace: "",
                identifierReferences: [
                    {
                        usage: "annotation",
                        identifier: "STRING"
                    },
                    {
                        usage: "annotation",
                        identifier: "DECIMAL"
                    },
                    {
                        usage: "annotation",
                        identifier: "BOOLEAN"
                    },
                    {
                        usage: "annotation",
                        identifier: "LIST_STRING"
                    },
                    {
                        usage: "take",
                        identifier: "0030"
                    },
                    {
                        usage: "take",
                        identifier: "0070"
                    },
                    {
                        usage: "take",
                        identifier: "0040"
                    },
                    {
                        usage: "take",
                        identifier: "0089"
                    },
                    {
                        usage: "take",
                        identifier: "0050"
                    },
                    {
                        usage: "take",
                        identifier: "0088"
                    },
                    {
                        usage: "take",
                        identifier: "0090"
                    },
                    {
                        usage: "take",
                        identifier: "0060"
                    },
                    {
                        usage: "take",
                        identifier: "0100"
                    },
                    {
                        usage: "take",
                        identifier: "PEN101/102"
                    },
                    {
                        usage: "take",
                        identifier: "1010"
                    },
                    {
                        usage: "take",
                        identifier: "1030"
                    },
                    {
                        usage: "take",
                        identifier: "1150"
                    },
                    {
                        usage: "take",
                        identifier: "1040"
                    },
                    {
                        usage: "take",
                        identifier: "1140"
                    },
                    {
                        usage: "take",
                        identifier: "1035"
                    },
                    {
                        usage: "take",
                        identifier: "1050"
                    },
                    {
                        usage: "take",
                        identifier: "1070"
                    },
                    {
                        usage: "take",
                        identifier: "1080"
                    },
                    {
                        usage: "take",
                        identifier: "1090"
                    },
                    {
                        usage: "take",
                        identifier: "1160"
                    },
                    {
                        usage: "take",
                        identifier: "1165"
                    },
                    {
                        usage: "take",
                        identifier: "2155"
                    },
                    {
                        usage: "take",
                        identifier: "2020"
                    },
                    {
                        usage: "take",
                        identifier: "2100"
                    },
                    {
                        usage: "take",
                        identifier: "2090"
                    },
                    {
                        usage: "take",
                        identifier: "2125"
                    },
                    {
                        usage: "take",
                        identifier: "2060"
                    },
                    {
                        usage: "take",
                        identifier: "2110"
                    },
                    {
                        usage: "take",
                        identifier: "2065"
                    },
                    {
                        usage: "take",
                        identifier: "2175"
                    },
                    {
                        usage: "take",
                        identifier: "2170"
                    },
                    {
                        usage: "take",
                        identifier: "3020"
                    },
                    {
                        usage: "take",
                        identifier: "3096"
                    },
                    {
                        usage: "take",
                        identifier: "3090"
                    },
                    {
                        usage: "take",
                        identifier: "3110"
                    },
                    {
                        usage: "take",
                        identifier: "7055"
                    },
                    {
                        usage: "take",
                        identifier: "7076"
                    },
                    {
                        usage: "take",
                        identifier: "7091/92/94/97/98"
                    },
                    {
                        usage: "take",
                        identifier: "7010/7060"
                    },
                    {
                        usage: "take",
                        identifier: "7077"
                    },
                    {
                        usage: "take",
                        identifier: "7010"
                    },
                    {
                        usage: "take",
                        identifier: "7036/7037"
                    },
                    {
                        usage: "take",
                        identifier: "7038/7039"
                    },
                    {
                        usage: "take",
                        identifier: "7041/7042"
                    },
                    {
                        usage: "take",
                        identifier: "7040"
                    },
                    {
                        usage: "take",
                        identifier: "7078"
                    },
                    {
                        usage: "take",
                        identifier: "PPE101/PPE102"
                    },
                    {
                        usage: "take",
                        identifier: "7079"
                    },
                    {
                        usage: "take",
                        identifier: "7027"
                    },
                    {
                        usage: "take",
                        identifier: "6110"
                    },
                    {
                        usage: "take",
                        identifier: "6190"
                    },
                    {
                        usage: "take",
                        identifier: "6051"
                    },
                    {
                        usage: "take",
                        identifier: "6055"
                    },
                    {
                        usage: "take",
                        identifier: "6070"
                    },
                    {
                        usage: "take",
                        identifier: "651/6153"
                    },
                    {
                        usage: "take",
                        identifier: "6152/6153"
                    },
                    {
                        usage: "take",
                        identifier: "8232"
                    },
                    {
                        usage: "take",
                        identifier: "6131"
                    },
                    {
                        usage: "take",
                        identifier: "6132"
                    },
                    {
                        usage: "take",
                        identifier: "6185"
                    },
                    {
                        usage: "take",
                        identifier: "6140"
                    },
                    {
                        usage: "take",
                        identifier: "6145"
                    },
                    {
                        usage: "take",
                        identifier: "6170"
                    },
                    {
                        usage: "take",
                        identifier: "8214"
                    },
                    {
                        usage: "take",
                        identifier: "6100"
                    },
                    {
                        usage: "take",
                        identifier: "4005"
                    },
                    {
                        usage: "take",
                        identifier: "6056"
                    },
                    {
                        usage: "take",
                        identifier: "6090"
                    },
                    {
                        usage: "take",
                        identifier: "5052"
                    },
                    {
                        usage: "take",
                        identifier: "5110"
                    },
                    {
                        usage: "take",
                        identifier: "5005"
                    },
                    {
                        usage: "take",
                        identifier: "5020"
                    },
                    {
                        usage: "take",
                        identifier: "5045"
                    },
                    {
                        usage: "take",
                        identifier: "5105"
                    },
                    {
                        usage: "take",
                        identifier: "0150"
                    },
                    {
                        usage: "take",
                        identifier: "5040"
                    },
                    {
                        usage: "take",
                        identifier: "5115"
                    },
                    {
                        usage: "take",
                        identifier: "5070"
                    },
                    {
                        usage: "take",
                        identifier: "5106"
                    },
                    {
                        usage: "take",
                        identifier: "5140"
                    },
                    {
                        usage: "take",
                        identifier: "5060"
                    },
                    {
                        usage: "take",
                        identifier: "5062"
                    },
                    {
                        usage: "take",
                        identifier: "4090"
                    },
                    {
                        usage: "take",
                        identifier: "4093"
                    },
                    {
                        usage: "take",
                        identifier: "4094"
                    },
                    {
                        usage: "take",
                        identifier: "4095"
                    },
                    {
                        usage: "take",
                        identifier: "4050"
                    },
                    {
                        usage: "take",
                        identifier: "4070"
                    },
                    {
                        usage: "take",
                        identifier: "4075"
                    },
                    {
                        usage: "take",
                        identifier: "0110"
                    },
                    {
                        usage: "take",
                        identifier: "8560"
                    },
                    {
                        usage: "take",
                        identifier: "8561"
                    },
                    {
                        usage: "take",
                        identifier: "0039"
                    },
                    {
                        usage: "take",
                        identifier: "0034"
                    },
                    {
                        usage: "take",
                        identifier: "0185"
                    },
                    {
                        usage: "take",
                        identifier: "KCDI"
                    },
                    {
                        usage: "take",
                        identifier: "KCDII"
                    },
                    {
                        usage: "take",
                        identifier: "KCTI"
                    },
                    {
                        usage: "take",
                        identifier: "KCOSI"
                    },
                    {
                        usage: "take",
                        identifier: "KCOSII"
                    },
                    {
                        usage: "take",
                        identifier: "KFRI"
                    },
                    {
                        usage: "take",
                        identifier: "KHOI"
                    },
                    {
                        usage: "take",
                        identifier: "KHOII"
                    },
                    {
                        usage: "take",
                        identifier: "KLEI"
                    },
                    {
                        usage: "take",
                        identifier: "KLEII"
                    },
                    {
                        usage: "take",
                        identifier: "KWLDI"
                    },
                    {
                        usage: "take",
                        identifier: "KAUTOII"
                    },
                    {
                        usage: "take",
                        identifier: "KCOLLI"
                    },
                    {
                        usage: "take",
                        identifier: "KCOLLII"
                    },
                    {
                        usage: "take",
                        identifier: "KCOMPI"
                    },
                    {
                        usage: "take",
                        identifier: "KCOMPII"
                    },
                    {
                        usage: "take",
                        identifier: "KCTII"
                    },
                    {
                        usage: "take",
                        identifier: "KD3DDI"
                    },
                    {
                        usage: "take",
                        identifier: "KD3DDII"
                    },
                    {
                        usage: "take",
                        identifier: "KFRII"
                    },
                    {
                        usage: "take",
                        identifier: "KWLDII"
                    },
                    {
                        usage: "take",
                        identifier: "2139"
                    },
                    {
                        usage: "take",
                        identifier: "2191"
                    },
                    {
                        usage: "take",
                        identifier: "2192"
                    },
                    {
                        usage: "take",
                        identifier: "2190"
                    },
                    {
                        usage: "take",
                        identifier: "PBI100"
                    },
                    {
                        usage: "take",
                        identifier: "PBI111"
                    },
                    {
                        usage: "take",
                        identifier: "PCOMM101"
                    },
                    {
                        usage: "take",
                        identifier: "PB221"
                    },
                    {
                        usage: "take",
                        identifier: "PPS101"
                    },
                    {
                        usage: "take",
                        identifier: "PSO101"
                    },
                    {
                        usage: "take",
                        identifier: "PMT095"
                    },
                    {
                        usage: "take",
                        identifier: "PMT096"
                    },
                    {
                        usage: "take",
                        identifier: "PMT112"
                    },
                    {
                        usage: "take",
                        identifier: "PMT115"
                    },
                    {
                        usage: "take",
                        identifier: "PMT151"
                    },
                    {
                        usage: "take",
                        identifier: "PMT153"
                    },
                    {
                        usage: "take",
                        identifier: "PMT157"
                    },
                    {
                        usage: "take",
                        identifier: "PMT165"
                    },
                    {
                        usage: "take",
                        identifier: "PMT171"
                    },
                    {
                        usage: "take",
                        identifier: "PMT172"
                    },
                    {
                        usage: "take",
                        identifier: "PMU130"
                    },
                    {
                        usage: "take",
                        identifier: "PHI112"
                    },
                    {
                        usage: "take",
                        identifier: "0038"
                    },
                    {
                        usage: "take",
                        identifier: "0035"
                    },
                    {
                        usage: "take",
                        identifier: "1185"
                    },
                    {
                        usage: "take",
                        identifier: "1055"
                    },
                    {
                        usage: "take",
                        identifier: "1056"
                    },
                    {
                        usage: "take",
                        identifier: "8005"
                    },
                    {
                        usage: "take",
                        identifier: "1191/PMT115"
                    },
                    {
                        usage: "take",
                        identifier: "1190"
                    },
                    {
                        usage: "take",
                        identifier: "2080"
                    },
                    {
                        usage: "take",
                        identifier: "3150"
                    },
                    {
                        usage: "take",
                        identifier: "3080"
                    },
                    {
                        usage: "take",
                        identifier: "3035"
                    },
                    {
                        usage: "take",
                        identifier: "3145"
                    },
                    {
                        usage: "take",
                        identifier: "3065"
                    },
                    {
                        usage: "take",
                        identifier: "3030"
                    },
                    {
                        usage: "take",
                        identifier: "3075"
                    },
                    {
                        usage: "take",
                        identifier: "3152"
                    },
                    {
                        usage: "take",
                        identifier: "3200"
                    },
                    {
                        usage: "take",
                        identifier: "3140"
                    },
                    {
                        usage: "take",
                        identifier: "3055"
                    }
                ],
                localCatalogItemName: {
                    "64d3a249-99f5-4d47-a22a-85d60a6d06e1": "PROGRAM"
                },
                includedCatalogItemName: {}
            }
        }
    };
let fakeProgram: Program;
const planObjs =
    [
        {id: 111111, approvalStatus: "APPROVAL_STATUS_PENDING", label: "CMHS Graduation Plan Draft Plan", status: "UNLOCKED", studentId: 13403746, type: "TYPE_HIGH_SCHOOL_OFFICIAL", classYear: 2013, planOfStudy: {pk: 1884, name: "CMHS Graduation Plan", institutionId: "16199USPU"}, requirements: [{id: 9650, name: "English", courses: [{highschoolId: "16199USPU", id: "0030", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "0040", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "0050", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "0060", credits: 1, gradeYear: 12}]}, {id: 9665, name: "Math", courses: [{highschoolId: "16199USPU", id: "1030", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "1050", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "1060", credits: 1, gradeYear: 12}, {highschoolId: "16199USPU", id: "1150", credits: 1, gradeYear: 10}]}, {id: 9675, name: "Social Studies", courses: [{highschoolId: "16199USPU", id: "3020", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "3055", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "3075", credits: 1, gradeYear: 12}, {highschoolId: "16199USPU", id: "3090", credits: 1, gradeYear: 11}]}, {id: 17944, name: "Fine Arts/Career Tech/Foreign Language", courses: [{highschoolId: "16199USPU", id: "4050", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "5005", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "5020", credits: 1, gradeYear: 12}]}, {id: 17939, name: "Physical Education/Dr. Ed.", courses: [{highschoolId: "16199USPU", id: "7010/7011", credits: 0.25, gradeYear: 10}, {highschoolId: "16199USPU", id: "7040", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "7055", credits: 0.5, gradeYear: 9}, {highschoolId: "16199USPU", id: "7060/7070", credits: 0.75, gradeYear: 10}]}, {id: 9659, name: "Science", courses: [{highschoolId: "16199USPU", id: "2090", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "2125", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "2160", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "2080", credits: 1, gradeYear: 12}]}]},
        {id: 111112, approvalStatus: "APPROVAL_STATUS_NOT_SUBMITTED", label: "CMHS Graduation Plan Draft Plan", status: "UNLOCKED", studentId: 13403748, type: "TYPE_HIGH_SCHOOL_OFFICIAL", classYear: 2013, planOfStudy: {pk: 1884, name: "CMHS Graduation Plan", institutionId: "16199USPU"}, requirements: [{id: 9650, name: "English", courses: [{highschoolId: "16199USPU", id: "0040", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "0050", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "0060", credits: 1, gradeYear: 12}, {highschoolId: "16199USPU", id: "0070", credits: 1, gradeYear: 9}]}, {id: 9665, name: "Math", courses: [{highschoolId: "16199USPU", id: "1030", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "1040", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "1070", credits: 1, gradeYear: 12}, {highschoolId: "16199USPU", id: "1150", credits: 1, gradeYear: 10}]}, {id: 9659, name: "Science", courses: [{highschoolId: "16199USPU", id: "2020", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "2100", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "2170", credits: 1, gradeYear: 11}]}, {id: 9675, name: "Social Studies", courses: [{highschoolId: "16199USPU", id: "3020", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "3055", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "3090", credits: 1, gradeYear: 11}]}, {id: 17947, name: "Electives", courses: [{highschoolId: "16199USPU", id: "4070", credits: 1, gradeYear: 11}]}, {id: 17944, name: "Fine Arts/Career Tech/Foreign Language", courses: [{highschoolId: "16199USPU", id: "4050", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "6140", credits: 1, gradeYear: 9}]}, {id: 17939, name: "Physical Education/Dr. Ed.", courses: [{highschoolId: "16199USPU", id: "7010/7011", credits: 0.25, gradeYear: 10}, {highschoolId: "16199USPU", id: "7055", credits: 0.5, gradeYear: 9}]}]},
        {id: 111113, approvalStatus: "APPROVAL_STATUS_PENDING", label: "CMHS Graduation Plan Draft Plan", status: "UNLOCKED", studentId: 13403757, type: "TYPE_HIGH_SCHOOL_OFFICIAL", classYear: 2013, planOfStudy: {pk: 1884, name: "CMHS Graduation Plan", institutionId: "16199USPU"}, requirements: [{id: 9665, name: "Math", courses: [{highschoolId: "16199USPU", id: "1010", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "1050", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "1060", credits: 1, gradeYear: 12}, {highschoolId: "16199USPU", id: "1140", credits: 1, gradeYear: 10}]}, {id: 9675, name: "Social Studies", courses: [{highschoolId: "16199USPU", id: "3020", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "3055", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "3091", credits: 1, gradeYear: 11}]}, {id: 17944, name: "Fine Arts/Career Tech/Foreign Language", courses: [{highschoolId: "16199USPU", id: "4050", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "5020", credits: 1, gradeYear: 11}]}, {id: 17939, name: "Physical Education/Dr. Ed.", courses: [{highschoolId: "16199USPU", id: "7010/7011", credits: 0.25, gradeYear: 10}, {highschoolId: "16199USPU", id: "7055", credits: 0.5, gradeYear: 9}]}, {id: 9650, name: "English", courses: [{highschoolId: "16199USPU", id: "0030", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "0040", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "0055", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "0065", credits: 1, gradeYear: 12}]}, {id: 9659, name: "Science", courses: [{highschoolId: "16199USPU", id: "2090", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "2160", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "2080", credits: 1, gradeYear: 9}]}, {id: 17947, name: "Electives", courses: [{highschoolId: "16199USPU", id: "0035", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "4050", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "5005", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "5040", credits: 1, gradeYear: 12}, {highschoolId: "16199USPU", id: "5115", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "5115", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "3200", credits: 1, gradeYear: 12}]}]},
        {id: 111114, approvalStatus: "APPROVAL_STATUS_PENDING", label: "CMHS Graduation Plan Draft Plan", status: "UNLOCKED", studentId: 13403759, type: "TYPE_HIGH_SCHOOL_OFFICIAL", classYear: 2013, planOfStudy: {pk: 1884, name: "CMHS Graduation Plan", institutionId: "16199USPU"}, requirements: [{id: 9650, name: "English", courses: [{highschoolId: "16199USPU", id: "0070", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "0080", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "0090", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "0100", credits: 1, gradeYear: 12}]}, {id: 9665, name: "Math", courses: [{highschoolId: "16199USPU", id: "1040", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "1060", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "1070", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "1150", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "1160", credits: 1, gradeYear: 12}]}, {id: 9659, name: "Science", courses: [{highschoolId: "16199USPU", id: "2020", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "2100", credits: 1, gradeYear: 10}]}, {id: 9675, name: "Social Studies", courses: [{highschoolId: "16199USPU", id: "3020", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "3060", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "3091", credits: 1, gradeYear: 11}]}, {id: 17944, name: "Fine Arts/Career Tech/Foreign Language", courses: [{highschoolId: "16199USPU", id: "4050", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "4070", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "4090", credits: 1, gradeYear: 12}, {highschoolId: "16199USPU", id: "5005", credits: 1, gradeYear: 10}]}, {id: 17939, name: "Physical Education/Dr. Ed.", courses: [{highschoolId: "16199USPU", id: "7010/7011", credits: 0.25, gradeYear: 10}, {highschoolId: "16199USPU", id: "7055", credits: 0.5, gradeYear: 9}, {highschoolId: "16199USPU", id: "7060/7070", credits: 0.75, gradeYear: 10}]}]},
        {id: 111115, approvalStatus: "APPROVAL_STATUS_NOT_SUBMITTED", label: "CMHS Graduation Plan Draft Plan", status: "UNLOCKED", studentId: 13403761, type: "TYPE_HIGH_SCHOOL_OFFICIAL", classYear: 2013, planOfStudy: {pk: 1884, name: "CMHS Graduation Plan", institutionId: "16199USPU"}, requirements: [{id: 17947, name: "Electives", courses: [{highschoolId: "16199USPU", id: "0035", credits: 1, gradeYear: 10}]}, {id: 9650, name: "English", courses: [{highschoolId: "16199USPU", id: "0030", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "0040", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "0050", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "0060", credits: 1, gradeYear: 12}]}, {id: 9665, name: "Math", courses: [{highschoolId: "16199USPU", id: "1010", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "1050", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "1140", credits: 1, gradeYear: 10}]}, {id: 9675, name: "Social Studies", courses: [{highschoolId: "16199USPU", id: "3020", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "3055", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "3075", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "3090", credits: 1, gradeYear: 11}]}, {id: 17944, name: "Fine Arts/Career Tech/Foreign Language", courses: [{highschoolId: "16199USPU", id: "4050", credits: 1, gradeYear: 9}, {highschoolId: "16199USPU", id: "4070", credits: 1, gradeYear: 9}]}, {id: 17939, name: "Physical Education/Dr. Ed.", courses: [{highschoolId: "16199USPU", id: "7010/7011", credits: 0.25, gradeYear: 10}, {highschoolId: "16199USPU", id: "7040", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "7040", credits: 1, gradeYear: 12}, {highschoolId: "16199USPU", id: "7055", credits: 0.5, gradeYear: 9}, {highschoolId: "16199USPU", id: "7060/7070", credits: 0.75, gradeYear: 10}]}, {id: 9659, name: "Science", courses: [{highschoolId: "16199USPU", id: "2090", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "2125", credits: 1, gradeYear: 10}, {highschoolId: "16199USPU", id: "2160", credits: 1, gradeYear: 11}, {highschoolId: "16199USPU", id: "2080", credits: 1, gradeYear: 12}]}]}
    ];
