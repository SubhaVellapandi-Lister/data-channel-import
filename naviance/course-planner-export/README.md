## Student Plan Export

Student Plan Export Data Dictionary

* Tenant_ID - Naviance ID for the district or single high school
* GUID - Academic Planner GUID for this student plan
* Plan_Name - Name that the student put on the plan
* Student_ID - Naviance ID for the student
* Author_ID - Naviance ID for the author (may be same as student)
* Created_Date - Date plan was first created
* Updated_Date - Date plan was last updated
* Status - Course Planner status - CP team can give valid values, this is used for approval status as well
* Approval_Requirement - Config value for the tenant to denote if approval is required
* Pathway_Label - Config value for the tenant to denote the label for pathways
* Cluster_Label - Config value for the tenant to denote the label for clusters
* Is_Active - Student plan is their current active plan (if they have multiple plans this may be false)
* Plan_Of_Study_Name - Descriptive name for the plan of study used by this student plan
* Plan_Of_Study_ID - Academic Planner GUID for this plan of study
* Plan_Of_Study_Is_Published - Whether or not this plan of study is currently published
* Cluster_Name - Descriptive name for the cluster (if any) used by this student plan
* Cluster_ID - Course Planner GUID for this cluster (if any).  Note that clusters aren't actual program objects in AP behind the scenes, they are just "tags" on pathways.
* Pathway_Name - Descriptive name for the pathway (if any) used by this student plan
* Pathway_ID - Academic Planner GUID for this pathway
* Pathway_Is_Published - Whether or not this pathway is currently published
* Num_Requirements_Met - Number of requirements in PoS and Pathway that are currently met by the student's plan
* Num_Requirements_Total - Number of total requirements PoS and Pathway
* Requirements_All_Met - Boolean true/false whether or not all requirements have been met by this plan
* Required_Credits_Total - Sum of all credits required for all requirements in PoS and Pathway
* Required_Credits_Remaining - Sum of credits still remaining for all requirements that have not been met by the completed or planned courses.
* PoS_Num_Requirements_Met - PoS specific number of requirements currently met by the student's plan
* PoS_Num_Requirements_Total - PoS specific number of total requirements
* PoS_Requirements_All_Met - PoS specific boolean true/false whether or not all requirements have been met by this plan
* PoS_Required_Credits_Total - PoS specific sum of all credits required for all requirements
* PoS_Required_Credits_Remaining - PoS specific sum of credits still remaining for all requirements
* Pathway_Num_Requirements_Met - Pathway specific number of requirements currently met by the student's plan
* Pathway_Num_Requirements_Total - Pathway specific number of total requirements
* Pathway_Requirements_All_Met - Pathway specific boolean true/false whether or not all requirements have been met by this plan
* Pathway_Required_Credits_Total - Pathway specific sum of all credits required for all requirements
* Pathway_Required_Credits_Remaining - Pathway specific sum of credits still remaining for all requirements
* Credit_Discrepancy - Boolean true/false flag if student plan currently has credit discrepancy due to completed course credits being lower than what was planned.
* Completed_Credits - Sum of all credits that a student has already completed based on their course history
* Planned_Credits - Sum of all credits that a student is still planning on taking
* Planned_Courses - Names of courses that a student is planning on taking
* Completed_Courses - Names of courses that a student has completed


## Build ZIP package from docker

Note that this is necessary because apSDK has non-JS dependencies that need to be built on linux in order to be importable on AWS lambda.

```bash
$ docker build --build-arg repoPassword=[repo pw] -t cpexport .

$ docker run --rm --entrypoint cat cpexport /usr/src/app/cpexport.zip > cpexport.zip

```

