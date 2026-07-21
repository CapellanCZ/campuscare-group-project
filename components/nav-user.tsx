"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconUser, IconBell, IconCommand, IconHelpCircle, IconSchool, IconCreditCard, IconLogout2 } from "@tabler/icons-react";

type NavUserProps = {
	name?: string
	email?: string
	roleLabel?: string
	avatarUrl?: string | null
	profileHref?: string
}

export function NavUser({
	name = "Clinic Staff",
	email = "staff@clinic.edu",
	roleLabel = "Staff",
	avatarUrl,
}: NavUserProps = {}) {
	const initials = name
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Avatar className="size-8" />} aria-label={`${name} account menu`}>
				{avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
				<AvatarFallback>{initials || "DR"}</AvatarFallback>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuItem className="flex items-center justify-start gap-2">
					<DropdownMenuLabel className="flex items-center gap-3">
						<Avatar className="size-10">
							{avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
							<AvatarFallback>{initials || "DR"}</AvatarFallback>
						</Avatar>
						<div>
							<span className="font-medium text-foreground">{name}</span>{" "}
							<br />
							<div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
								{email}
							</div>
							<div className="mt-0.5 text-[10px] text-muted-foreground">
								{roleLabel}
							</div>
						</div>
					</DropdownMenuLabel>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<IconUser
						/>
						Profile
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<IconBell
						/>
						Notifications
					</DropdownMenuItem>
					<DropdownMenuItem>
						<IconCommand
						/>
						Keyboard shortcuts
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<IconHelpCircle
						/>
						Help center
					</DropdownMenuItem>
					<DropdownMenuItem>
						<IconSchool
						/>
						Agent training
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<IconCreditCard
						/>
						Subscription
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer"
						variant="destructive"
					>
						<IconLogout2
						/>
						Log out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
