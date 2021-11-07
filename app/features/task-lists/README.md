
# Distributed Projects


Add [TaskYaml](https://taskyaml.org) files with a URI prefixed with "taskyaml:" into the "distrinet settings", then you'll go to the "projects" part of this app and see project activity lists.

For schedule forecasting locally:

- Download and run the [Schedule-Forecast service](https://github.com/trentlarson/Schedule-Forecast).


## Test

- Optional: use the "Test Settings" on the test page.

- Show tasks, expand subtasks and dependant tasks, and show labels. Show the top 3 and biggest 5 of each list.

- Ensure you've generated a key in settings and they're saved. Click to show a set of tasks and find one with an ID in it, then click Sign Log. See a failure with a missing or incorrect password. Then fill in the correct password and see a success and check the .log.yml file next to the tasks.yml file and see that it has a log message with a new timestamp.




## Features

#### User Stories - Current

- See some or all the activities in the projects I know.
- Forecast timeline and see due dates for a particular project (using Schedule-Forecast).
- Add a record of volunteering for a particular activity.

#### User Stories - Future

- I can create a list of projects & their locations, then can report on high priority, high/low estimates, and recently changed activity from any or all of them.
- I can store my project task list and share it privately with selected individuals, with tools to make it easy to propose edits to the lists.
- I can store a project task list in a public git repo.  Individuals can volunteer for items or propose changes.
- I can use simple APIs, eg. basic REST endpoints supporting our schema.

- I can see the next task in the critical path for project delivery in order to push on the next-most-important piece of the project (and report on whether the due dates are as expected).
- I can see where my task(s) fit into the full picture.
- I can see when other tasks are done so that they can plan their time according to the dependencies.

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
- Tasks.org is open-source with sync to many services and a mobile version (on F-Droid)
