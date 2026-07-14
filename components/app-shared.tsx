import type { ReactNode } from "react";
import { IconLayoutGrid, IconChecklist, IconChartBar, IconMessage, IconUsers, IconPlug, IconSettings, IconHelpCircle, IconActivity } from "@tabler/icons-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		items: [
			{
				title: "Overview",
				path: "#/overview",
				icon: (
					<IconLayoutGrid
					/>
				),
				isActive: true,
			},
		],
	},
	{
		label: "Today",
		items: [
			{
				title: "Queue",
				path: "#/queue",
				icon: (
					<IconChecklist
					/>
				),
			},
			{
				title: "Team insights",
				path: "#/team-insights",
				icon: (
					<IconChartBar
					/>
				),
			},
		],
	},
	{
		label: "Inbox",
		items: [
			{
				title: "Conversations",
				icon: (
					<IconMessage
					/>
				),
				subItems: [
					{ title: "Unassigned", path: "#/inbox/unassigned" },
					{ title: "Assigned to me", path: "#/inbox/assigned" },
					{ title: "Recently closed", path: "#/inbox/closed" },
				],
			},
			{
				title: "Customers",
				path: "#/customers",
				icon: (
					<IconUsers
					/>
				),
			},
			{
				title: "Channels",
				path: "#/channels",
				icon: (
					<IconPlug
					/>
				),
			},
		],
	},
	{
		label: "Organization",
		items: [
			{
				title: "Workspace",
				icon: (
					<IconSettings
					/>
				),
				subItems: [
					{ title: "Branding", path: "#/workspace/branding" },
					{ title: "Team & roles", path: "#/workspace/team" },
					{ title: "API keys", path: "#/workspace/api-keys" },
					{ title: "Webhooks", path: "#/workspace/webhooks" },
					{ title: "Billing", path: "#/workspace/billing" },
				],
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Help Center",
		path: "#/help",
		icon: (
			<IconHelpCircle
			/>
		),
	},
	{
		title: "System status",
		path: "#/status",
		icon: (
			<IconActivity
			/>
		),
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
