import { Suspense } from "react"
import Link from "next/link"
import {
  Shield,
  Briefcase,
  Ticket,
  Megaphone,
  MessagesSquare,
  Home as HomeIcon,
  GraduationCap,
  Users,
  Heart,
  BookOpen,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/Logo"
import SuspensionBanner from "@/components/SuspensionBanner"
import AggieRingIcon from "@/components/AggieRingIcon"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Suspense>
        <SuspensionBanner />
      </Suspense>

      {/* Nav */}
      <header className="border-b bg-header-bg">
        <nav className="container mx-auto flex items-center justify-between px-4 py-6">
          <div className="flex items-center space-x-2">
            <Logo href="/" />
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://www.zeffy.com/en-US/donation-form/donate-to-aggies-helping-aggies"
              target="_blank"
              rel="noopener noreferrer"
              title="Help keep Aggies Helping Aggies free for the community"
              className="items-center rounded-md px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 inline-flex"
              aria-label="Donate to help keep Aggies Helping Aggies free"
            >
              Donate
            </a>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 sm:py-20 text-center">
        <h1 className="mb-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-page-heading-text">
          Support. Connect. Share.
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg sm:text-xl text-page-subtext">
          Built for the Aggie community. Help fund a classmate&apos;s Aggie Ring, find housing near campus,
          land an internship, and stay connected with a community that shows up for each other.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link href="/login">
            <Button size="lg" className="text-lg">
              Join the Community
            </Button>
          </Link>
        </div>

        {/* Channel preview strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-page-subtext">
          {[
            { icon: <HomeIcon className="h-5 w-5" />, label: "Home" },
            { icon: <MessagesSquare className="h-5 w-5" />, label: "General" },
            { icon: <Briefcase className="h-5 w-5" />, label: "Jobs & Networking" },
            { icon: <Ticket className="h-5 w-5" />, label: "Tickets" },
            { icon: <Megaphone className="h-5 w-5" />, label: "Promotions" },
            { icon: <AggieRingIcon style={{ width: 20, height: 20 }} />, label: "Fundraising" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className="flex items-center justify-center h-8 w-8 text-icon dark:text-white">
                {icon}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Trust badge */}
        <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-page-subtext">
          <svg className="h-5 w-5 text-icon dark:text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Aggie-focused community</span>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-2xl sm:text-3xl font-bold text-page-heading-text">
          Built for Aggies, by Aggies
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {/* Fundraising — highlighted as a unique TAMU differentiator */}
          <Card className="border-2 border-icon/30 bg-muted/30">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center text-icon dark:text-white"><AggieRingIcon style={{ width: 40, height: 40 }} /></div>
              <CardTitle className="text-card-header-text">Fundraising</CardTitle>
              <CardDescription className="text-page-subtext">
                Be the reason a student gets their Aggie Ring. Support fellow Aggies with ring funds,
                graduation regalia, and other community causes unique to the Aggie tradition.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center text-icon dark:text-white"><Ticket className="h-6 w-6" /></div>
              <CardTitle className="text-card-header-text">Tickets</CardTitle>
              <CardDescription className="text-page-subtext">
                Have an extra ticket or need one for the game? Post in the Tickets channel and connect with fellow Aggies.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center text-icon dark:text-white"><Briefcase className="h-6 w-6" /></div>
              <CardTitle className="text-card-header-text">Jobs, Internships & Networking</CardTitle>
              <CardDescription className="text-page-subtext">
                Discover career opportunities and internships shared by fellow Aggies,
                Former Students, and local businesses.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center text-icon dark:text-white"><Megaphone className="h-6 w-6" /></div>
              <CardTitle className="text-card-header-text">Promotions & Events</CardTitle>
              <CardDescription className="text-page-subtext">
                Stay updated on local business promotions and community events
                tailored specifically for the Aggie community.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center text-icon dark:text-white"><MessagesSquare className="h-6 w-6" /></div>
              <CardTitle className="text-card-header-text">General Discussion</CardTitle>
              <CardDescription className="text-page-subtext">
                Ask questions, share experiences, and connect with Aggies across
                all walks of life. Discuss with students, former students, parents, faculty, and locals.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 border-icon/30 bg-muted/30">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center text-icon dark:text-white"><Shield className="h-6 w-6" /></div>
              <CardTitle className="text-card-header-text">Aggie-Focused Community</CardTitle>
              <CardDescription className="text-page-subtext">
                A questionnaire-based screening process keeps the community Aggie-focused.
              </CardDescription>
            </CardHeader>
          </Card>

        </div>
      </section>

      {/* Who is this for? */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold text-page-heading-text">
            Who Is This For?
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-page-subtext">
            The Aggie Network is bigger than just current students. This platform is for everyone
            connected to Texas A&M.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                icon: <GraduationCap className="h-7 w-7 text-icon dark:text-white" />,
                label: "Students",
                description: "Current TAMU students, auto-verified with a @tamu.edu email",
              },
              {
                icon: <Users className="h-7 w-7 text-icon dark:text-white" />,
                label: "Former Students",
                description: "Aggies who have walked across the stage and carry the ring",
              },
              {
                icon: <Heart className="h-7 w-7 text-icon dark:text-white" />,
                label: "Parents & Family",
                description: "Aggie Moms, dads, and family members who bleed maroon",
              },
              {
                icon: <BookOpen className="h-7 w-7 text-icon dark:text-white" />,
                label: "Faculty & Staff",
                description: "TAMU faculty and staff who are part of the Aggie community",
              },
              {
                icon: <MapPin className="h-7 w-7 text-icon dark:text-white" />,
                label: "BCS Locals",
                description: "Bryan-College Station community members connected to TAMU",
              },
            ].map(({ icon, label, description }) => (
              <div key={label} className="flex flex-col items-center text-center rounded-lg bg-card p-6 shadow-sm">
                <div className="mb-3">{icon}</div>
                <h3 className="mb-1 font-semibold text-card-header-text">{label}</h3>
                <p className="text-sm text-page-subtext">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-2xl sm:text-3xl font-bold text-page-heading-text">
            Getting Started is Easy
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-icon text-2xl font-bold text-steps-text">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold text-page-heading-text">Sign In with Google</h3>
              <p className="text-page-subtext">
                Use your Google account to sign in. TAMU email addresses
                (@tamu.edu) are recognized automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-icon text-2xl font-bold text-steps-text">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold text-page-heading-text">Verify Your Connection</h3>
              <p className="text-page-subtext">
                TAMU email users get instant access. Others complete a short
                questionnaire so we can confirm your Aggie connection.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-icon text-2xl font-bold text-steps-text">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold text-page-heading-text">Start Connecting</h3>
              <p className="text-page-subtext">
                Browse channels, post opportunities, support fundraisers,
                and engage with a community that gets it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/50 py-12 sm:py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="mb-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-page-heading-text">
            Ready to Join the Network?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-page-subtext">
            Be part of a community where Aggies help Aggies thrive.
            Whether you're looking for opportunities, offering support, or just
            staying connected — this is your platform.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg">
              Get Started with Google
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-footer-bg py-8">
        <div className="container mx-auto px-4 text-center text-footer-text">
          <p className="mb-2">
            &copy; {new Date().getFullYear()} Aggies Helping Aggies. Built for Aggies by Aggies.
          </p>
          <p className="text-sm mb-1">
            This is an independent platform and is not officially affiliated with Texas A&M University.
          </p>
          <p className="text-sm mb-3">
            Donations help keep this platform free and running for the Aggie community.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link href="/privacy-policy" className="underline hover:opacity-80">
              Privacy Policy
            </Link>
            <span aria-hidden="true">&middot;</span>
            <Link href="/terms" className="underline hover:opacity-80">
              Terms and Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
