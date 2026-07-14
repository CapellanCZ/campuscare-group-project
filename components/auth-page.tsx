"use client";

import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { FloatingPaths } from "@/components/floating-paths";
import { IconChevronLeft, IconAt, IconEyeClosed } from "@tabler/icons-react";
import Link from "next/link";


export function AuthPage() {
	return (
		<main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
			{/* <div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
				<div 
					className="absolute inset-0 bg-center"
					style={{ backgroundImage: 'url(https://onlineapp.nu-dasma.edu.ph/portal/facade/dasma.webp)', backgroundSize: '200%' }}
				/>
				<div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
				<img src="/Frame 8.svg" alt="Logo" className="relative z-10 mr-auto h-10" />
				<div className="relative z-10 mt-auto">
					<blockquote className="space-y-2">
						<p className="text-xl text-black/40">
							"I'm a bulldog. I refuse to lose, and I'm always going to compete. I guarantee I'm going to give everything I can."
						</p>
						<footer className="font-mono font-semibold text-sm text-black/40">
							- Jason Place
						</footer>
					</blockquote>
				</div>
			</div> */}
			<div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
				<div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
				<img src="/images/logo.png" alt="Logo" className="relative z-10 mr-auto h-10" />

				<div className="z-10 mt-auto">
					<blockquote className="space-y-2">
						<p className="text-xl">
							"I'm a bulldog. I refuse to lose, and I'm always going to compete. I guarantee I'm going to give everything I can."
						</p>
						<footer className="font-mono font-semibold text-sm">
							~ Jason Place
						</footer>
					</blockquote>
				</div>
				<div className="absolute inset-0">
					<FloatingPaths position={1} />
					<FloatingPaths position={-1} />
				</div>
			</div>
			<div className="relative flex min-h-screen flex-col justify-center px-8">
				{/* Top Shades */}
				<div
					aria-hidden
					className="absolute inset-0 isolate -z-10 opacity-60 contain-strict"
				>
					<div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
					<div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
					<div className="absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
				</div>
				<Button className="absolute top-7 left-5" variant="ghost" render={<a href="#" />} nativeButton={false}><IconChevronLeft data-icon="inline-start" />Home</Button>

				<div className="mx-auto space-y-4 sm:w-sm">
					<div className="flex flex-col space-y-1">
						<h1 className="font-bold text-2xl tracking-wide">
							Sign in
						</h1>
						<p className="text-base text-muted-foreground">
							Enter your work email to get a secure magic link.
						</p>
					</div>
					
					<form className="space-y-4">
						<Field className="max-w-sm">
							{/* <FieldLabel htmlFor="inline-end-input">Work Email</FieldLabel> */}
							<InputGroup>
								<InputGroupInput
								placeholder="your.email@example.com"
								type="email"
							/>
							<InputGroupAddon align="inline-start">
								<IconAt
								/>
							</InputGroupAddon>
							</InputGroup>
						</Field>

						{/* <Field className="max-w-sm">
							<FieldLabel htmlFor="inline-end-input">Password</FieldLabel>
							<InputGroup>
								<InputGroupInput
									id="inline-end-input"
									type="password"
									placeholder="********"
								/>
								<InputGroupAddon align="inline-end">
									<IconEyeClosed/>
								</InputGroupAddon>
							</InputGroup>
						</Field> */}
						<p className="text-start text-muted-foreground text-xs">
							Your sign-in link stays active for 15 minutes.
						</p>

						<Button className="w-full" type="button">
							<Link href="/dashboard">Sign In</Link>
						</Button>
					</form>
					<p className="mt-8 text-muted-foreground text-sm">
						By clicking continue, you agree to our{" "}
						<a
							className="underline underline-offset-4 hover:text-primary"
							href="#"
						>
							Terms of Service
						</a>{" "}
						and{" "}
						<a
							className="underline underline-offset-4 hover:text-primary"
							href="#"
						>
							Privacy Policy
						</a>
						.
					</p>
				</div>
			</div>
		</main>
	);
}
