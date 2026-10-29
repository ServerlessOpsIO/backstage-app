import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import {
  GitHubWorkWidget,
  GitHubWorkWidgetRenderer,
} from './components/github-work-widget';
import {
  GoogleCalendarWidget,
  GoogleCalendarWidgetRenderer,
} from './components/google-calendar-widget';
import { LocalUtcClockWidget } from './components/local-utc-clock-widget';
import { ServerlessOpsLogoWidget } from './components/serverlessops-logo-widget';
import {
  DatadogMonitorsWidget,
  DatadogMonitorsWidgetRenderer,
} from './components/datadog-monitors-widget';

const datadogMonitorsWidget = HomePageWidgetBlueprint.make({
  name: 'datadog-monitors',
  params: {
    name: 'HomePageDatadogMonitors',
    title: 'Datadog Monitors',
    description: 'Datadog monitors matching the configured alert query',
    componentProps: { Renderer: DatadogMonitorsWidgetRenderer },
    components: async () => ({ Content: DatadogMonitorsWidget }),
  },
});

const serverlessOpsLogoWidget = HomePageWidgetBlueprint.make({
  name: 'serverlessops-logo',
  params: {
    name: 'HomePageServerlessOpsLogo',
    title: 'ServerlessOps',
    description: 'ServerlessOps logo',
    componentProps: { Renderer: ServerlessOpsLogoWidget },
    components: async () => ({ Content: ServerlessOpsLogoWidget }),
  },
});

const localUtcClockWidget = HomePageWidgetBlueprint.make({
  name: 'local-utc-clock',
  params: {
    name: 'HomePageLocalAndUtcClock',
    title: 'World Clocks',
    description: 'Current local time and UTC',
    components: async () => ({
      Content: () => <LocalUtcClockWidget />,
    }),
  },
});

const githubOpenedIssuesWidget = HomePageWidgetBlueprint.make({
  name: 'github-opened-issues',
  params: {
    componentProps: { Renderer: GitHubWorkWidgetRenderer },
    name: 'HomePageGitHubOpenedIssues',
    title: 'Opened Issues',
    description: 'Open issues created by the signed-in user',
    components: async () => ({
      Content: () => <GitHubWorkWidget category="issues-opened" title="Opened Issues" />,
    }),
  },
});

const githubAssignedIssuesWidget = HomePageWidgetBlueprint.make({
  name: 'github-assigned-issues',
  params: {
    componentProps: { Renderer: GitHubWorkWidgetRenderer },
    name: 'HomePageGitHubAssignedIssues',
    title: 'Assigned Issues',
    description: 'Open issues assigned to the signed-in user',
    components: async () => ({
      Content: () => <GitHubWorkWidget category="issues-assigned" title="Assigned Issues" />,
    }),
  },
});

const githubOpenedPrsWidget = HomePageWidgetBlueprint.make({
  name: 'github-opened-prs',
  params: {
    componentProps: { Renderer: GitHubWorkWidgetRenderer },
    name: 'HomePageGitHubOpenedPrs',
    title: 'Opened Pull Requests',
    description: 'Open pull requests created by the signed-in user',
    components: async () => ({
      Content: () => <GitHubWorkWidget category="prs-opened" title="Opened Pull Requests" />,
    }),
  },
});

const githubReviewRequestedPrsWidget = HomePageWidgetBlueprint.make({
  name: 'github-review-requested-prs',
  params: {
    componentProps: { Renderer: GitHubWorkWidgetRenderer },
    name: 'HomePageGitHubReviewRequestedPrs',
    title: 'Review Requested Pull Requests',
    description: 'Open pull requests requesting review from the signed-in user',
    components: async () => ({
      Content: () => <GitHubWorkWidget category="prs-review-requested" title="Review Requested Pull Requests" />,
    }),
  },
});

const googleCalendarTodayWidget = HomePageWidgetBlueprint.make({
  name: 'google-calendar-today',
  params: {
    componentProps: { Renderer: GoogleCalendarWidgetRenderer },
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
    serverlessOpsLogoWidget,
    datadogMonitorsWidget,
    localUtcClockWidget,
    githubOpenedIssuesWidget,
    githubAssignedIssuesWidget,
    githubOpenedPrsWidget,
    githubReviewRequestedPrsWidget,
    googleCalendarTodayWidget,
  ],
});
