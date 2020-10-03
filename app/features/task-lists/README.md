
# Distributed Projects

- Simply add [TaskYaml](https://taskyaml.org) files with a URI prefixed with "taskyaml:" into the "distrinet settings", then you'll go to the "projects" part of this app and see project activity lists.

For schedule forecasting:

Download and run the [Schedule-Forecast service](https://github.com/trentlarson/Schedule-Forecast).


## Features

#### User Stories - Current

- See some or all the activities in the projects I know.
- Forecast timeline and see due dates for a particular project (using Schedule-Forecast).
- Add a record of volunteering for a particular activity.

#### User Stories - Future

- I can create a list of projects & their locations, then can report on high priority, high/low estimates, and recently changed activity from any or all of them.
- I can store my project task list and share it privately with selected individuals, with tools to make it easy to propose edits to the lists.
- I can store a project task list in a public git repo.  Individuals can volunteer for items or propose changes.
- Expose simple APIs, eg. basic REST endpoints supporting our schema.

#### Tools

- Tools must support public and private folders.
- Tools must support these fields: ID string, priority number, estimate number, blocking & containing links between issues, and assignee user IDs
- Tools may support optional activity fields: skill set, watcher user IDs
- Tools supporting export and/or import must preserve the mandatory activity fields in each action.
- Tools with APIs must support the mandatory activity fields.
- Tools should support [taskyaml.org](taskyaml.org) & CSV formats.


## Related Work

- Sharing To-Do Lists with a Distributed Task Manager (1993)
  https://dl.eusset.eu/bitstream/20.500.12015/2553/1/00063.pdf
- Wf-ATOMS is a framework for the specification and management of workflows (2000)
  https://www.researchgate.net/publication/237297345_Distributed_Task_Management_by_Means_of_Workflow_Atoms
- Distributed task management system based on Git and Markdown (2016)
  https://github.com/sologub/frump

