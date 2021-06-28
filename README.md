# GAS-Notion-Gcal-Todoist-sync
A GAS script to synchronize tasks with Notion, google calendar, and Todoist.

## Features
**Free-to-use** tasksynchronization via GAS. Both Notion and Google accounts can be used with the free plan.

Tasks in Notion are assumed to be combined into a single database.

Different tasks can be synchronized with different calendars (set in the relation property of Notion Database. See below).

## Requirement
* GAS
	* Google Calendar API
* Notion
	* Notion API

## Installation
### Notion
* Notion Database
	1. Create a Task Database
		* Duplicate [the sample](https://www.notion.so/0e567f34b9eb44b5a17c921ae6d11c0d?v=585ac379bb71459e8e400e97dac107e2) into your Notion Workspace.	
	2. Create a Calendar Database
		* Duplicate [the sample](https://www.notion.so/819a124fbbe145ba897f2e2e118192f3?v=b1ab21b10b69416b8a767908787d990c) into your Notion Workspace.	
		* Add all the Google calendars ID you plan to use into the database.
* Notion API
	1. Create an Internal Integration Token at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
	* Invite the API to all databases to be used.
	
### GAS
1. clone this repository
2. copy files into your GAS project
3. Add `Calendar API` on the project.
4. Set time trigger to function `main()`
5. Set all calendar updates to trigger function `doCalendarPost()`
6. Add the Notion API token into GAS Script Property - `NOTION_API_TOKEN` via **the legacy IDE.**

### Todoist (if you want)
1.Sync all your google calendars with Todoist. Enable the "Remove completed tasks from calendar" option.

## Usage
### Notion Database >> Google Calendar
When you run the main function, the following tasks will be synchronized to google calendar. In order to synchronize tasks, you need to set the title, due date, and calendar.

* New Tasks
	* Tasks that have not flagged as Done, and do not have a calendar event ID.
* Updated Tasks
	* Tasks that are not flagged as Done, have a calendar event ID, and have *the update flag*.
	* The update flag is set to true when the task's update time is newer than the calendar's update date.
* Completed Tasks
	* Tasks with the Done flag and Calendar Event IDs remaining.

### Google Calendar >> Notion Database
Create, update, and delete calendars will be synced to Notion.

* Create and Update: Create and update Notion Data.
* Delete: Notion Data will not be deleted, but will be flagged as Done (Calendar ID will be deleted).

### Google Calendar <->Todoist
see [https://todoist.com/ja/help/articles/use-google-calendar-with-todoist](https://todoist.com/ja/help/articles/use-google-calendar-with-todoist)

## Note
* Limitations
	* Tasks completed in Notion cannot be completed in Todoist. (Google Calendar can be deleted)
	* If you update Notion again within a minute after synchronization, it will not be reflected in Google Calendar.
	* Many of the comments are in Japanese. I'll fix them in English soon.
* Contribution
	* Feel free to give me any issues or PRs to make this software better!

## Reference
* [https://developers.google.com/calendar/api/v3/reference](https://developers.google.com/calendar/api/v3/reference)
* [https://developers.notion.com/reference/intro](https://developers.notion.com/reference/intro)

## License
This software is released under the MIT License, see [LICENSE](https://github.com/JulyFaraway/GAS-Notion-GCal-Todoist-Sync/blob/main/LICENSE).
