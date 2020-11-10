## Student Plan Export

Student Plan Export Data Dictionary

* Tenant_ID - *(GUID String)* Naviance ID for the district or single high school
* GUID - *(GUID String)* Academic Planner GUID for this student plan
* Plan_Name - *(String)* Name that the student put on the plan
* Student_ID - *(String)* Naviance ID for the student
* Author_ID - *(String)* Naviance ID for the author (may be same as student)
* Created_Date - *(DateString)* Date plan was first created
* Updated_Date - *(DateString)* Date plan was last updated
* Status - *(String)* Course Planner status - CP team can give valid values, this is used for approval status as well
* Approval_Requirement - *(String)* Config value for the tenant to denote if approval is required, cp team can provide valid values
* Pathway_Label - *(String)* Config value for the tenant to denote the label for pathways
* Cluster_Label - *(String)* Config value for the tenant to denote the label for clusters
* Is_Active - *(Boolean)* Student plan is their current active plan (if they have multiple plans this may be false)
* Plan_Of_Study_Name - *(String)* Descriptive name for the plan of study used by this student plan
* Plan_Of_Study_ID - *(GUID String)* Academic Planner GUID for this plan of study
* Plan_Of_Study_Is_Published - *(Boolean)* Whether or not this plan of study is currently published
* Cluster_Name - *(String)* Descriptive name for the cluster (if any) used by this student plan
* Cluster_ID - *(GUID String)* Course Planner GUID for this cluster (if any).  Note that clusters aren't actual program objects in AP behind the scenes, they are just "tags" on pathways.
* Pathway_Name - *(String)* Descriptive name for the pathway (if any) used by this student plan
* Pathway_ID - *(GUID String)* Academic Planner GUID for this pathway
* Pathway_Is_Published - *(Boolean)* Whether or not this pathway is currently published
* Num_Requirements_Met - *(Integer)* Number of requirements in PoS and Pathway that are currently met by the student's plan
* Num_Requirements_Total - *(Integer)* Number of total requirements PoS and Pathway
* Requirements_All_Met - *(Boolean)* Boolean true/false whether or not all requirements have been met by this plan
* Required_Credits_Total - *(Decimal)* Sum of all credits required for all requirements in PoS and Pathway
* Required_Credits_Remaining - *(Decimal)* Sum of credits still remaining for all requirements that have not been met by the completed or planned courses.
* Credit_Deficiency - *(Boolean)* Boolean true/false flag if student plan currently has credit deficiency due to completed course credits being lower than what was planned.
* Completed_Credits - *(Decimal)* Sum of all credits that a student has already completed based on their course history
* Completed_Credits_Used - *(Decimal)* Sum of all credits that a student has already completed and were used to meet requirements
* Planned_Credits - *(Decimal)* Sum of all credits that a student is still planning on taking
* Planned_Credits_Used - *(Decimal)* Sum of all planned course credits that were used to meet requirements
* PoS_Num_Requirements_Met - *(Integer)* PoS specific number of requirements currently met by the student's plan
* PoS_Num_Requirements_Total - *(Integer)* PoS specific number of total requirements
* PoS_Requirements_All_Met - *(Boolean)* PoS specific boolean true/false whether or not all requirements have been met by this plan
* PoS_Required_Credits_Total - *(Decimal)* PoS specific sum of all credits required for all requirements
* PoS_Required_Credits_Remaining - *(Decimal)* PoS specific sum of credits still remaining for all requirements
* PoS_Credit_Deficiency - *(Boolean)* Boolean true/false flag if PoS currently has credit deficiency due to completed course credits being lower than what was planned.
* PoS_Completed_Credits - *(Decimal)* Sum of all credits that a student has already completed based on their course history and used by or associated with PoS
* PoS_Completed_Credits_Used - *(Decimal)* Sum of all credits that a student has already completed and were used to meet requirements in PoS
* PoS_Planned_Credits - *(Decimal)* Sum of all planned credits that are associated to PoS
* PoS_Planned_Credits_Used - *(Decimal)* Sum of all planned course credits that were used to meet requirements in PoS
* Pathway_Num_Requirements_Met - *(Integer)* Pathway specific number of requirements currently met by the student's plan
* Pathway_Num_Requirements_Total - *(Integer)* Pathway specific number of total requirements
* Pathway_Requirements_All_Met - *(Integer)* Pathway specific boolean true/false whether or not all requirements have been met by this plan
* Pathway_Required_Credits_Total - *(Decimal)* Pathway specific sum of all credits required for all requirements
* Pathway_Required_Credits_Remaining - *(Decimal)* Pathway specific sum of credits still remaining for all requirements
* Pathway_Credit_Deficiency - *(Boolean)* Boolean true/false flag if PoS currently has credit deficiency due to completed course credits being lower than what was planned.
* Pathway_Completed_Credits - *(Decimal)* Sum of all credits that a student has already completed based on their course history and used by or associated with PoS
* Pathway_Completed_Credits_Used - *(Decimal)* Sum of all credits that a student has already completed and were used to meet requirements in PoS
* Pathway_Planned_Credits - *(Decimal)* Sum of all planned credits that are associated to PoS
* Pathway_Planned_Credits_Used - *(Decimal)* Sum of all planned course credits that were used to meet requirements in PoS
* Planned_Courses - *(String List)* Names of courses that a student is planning on taking
* Completed_Courses - *(String List)* Names of courses that a student has completed
* Credit_Deficiency_Number - *(Decimal)* Number of credit deficiency


## Build ZIP package from docker

Note that this is necessary because apSDK has non-JS dependencies that need to be built on linux in order to be importable on AWS lambda.

```bash
$ docker build --build-arg repoPassword=[repo pw] -t cpexport .

$ docker run --rm --entrypoint cat cpexport /usr/src/app/cpexport.zip > cpexport.zip

```

