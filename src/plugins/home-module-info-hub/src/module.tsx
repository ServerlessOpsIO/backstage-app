import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import { GitHubWorkWidget } from './components/github-work-widget';
import { GoogleCalendarWidget } from './components/google-calendar-widget';

const githubOpenedIssuesWidget = HomePageWidgetBlueprint.make({
  name: 'github-opened-issues',
  params: {
    name: 'HomePageGitHubOpenedIssues',
    title: 'GitHub Opened Issues',
    description: 'Open issues created by the signed-in user',
    components: async () => ({
      Content: () => <GitHubWorkWidget category="issues-opened" title="GitHub Opened Issues" />,
    }),
  },
});

const githubAssignedIssuesWidget = HomePageWidgetBlueprint.make({
  name: 'github-assigned-issues',
  params: {
    name: 'HomePageGitHubAssignedIssues',
    title: 'GitHub Assigned Issues',
    description: 'Open issues assigned to the signed-in user',
    components: async () => ({
      Content: () => <GitHubWorkWidget category="issues-assigned" title="GitHub Assigned Issues" />,
    }),
  },
});

const githubOpenedPrsWidget = HomePageWidgetBlueprint.make({
  name: 'github-opened-prs',
  params: {
    name: 'HomePageGitHubOpenedPrs',
    title: 'GitHub Opened Pull Requests',
    description: 'Open pull requests created by the signed-in user',
    components: async () => ({
      Content: () => <GitHubWorkWidget category="prs-opened" title="GitHub Opened Pull Requests" />,
    }),
  },
});

const githubReviewRequestedPrsWidget = HomePageWidgetBlueprint.make({
  name: 'github-review-requested-prs',
  params: {
    name: 'HomePageGitHubReviewRequestedPrs',
    title: 'GitHub Review Requested Pull Requests',
    description: 'Open pull requests requesting review from the signed-in user',
    components: async () => ({
      Content: () => <GitHubWorkWidget category="prs-review-requested" title="GitHub Review Requested Pull Requests" />,
    }),
  },
});

const googleCalendarTodayWidget = HomePageWidgetBlueprint.make({
  name: 'google-calendar-today',
  params: {
    name: 'HomePageGoogleCalendarToday',
    title: "Today's Calendar",
    description: "Today's events from the signed-in user's primary Google Calendar",
    components: async () => ({
      Content: () => <GoogleCalendarWidget title="Today's Calendar" />,
    }),
  },
});

export const homeModuleInfoHub = createFrontendModule({
  pluginId: 'home',
  extensions: [
    githubOpenedIssuesWidget,
    githubAssignedIssuesWidget,
    githubOpenedPrsWidget,
    githubReviewRequestedPrsWidget,
    googleCalendarTodayWidget,
  ],
});
