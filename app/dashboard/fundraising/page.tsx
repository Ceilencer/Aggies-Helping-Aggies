'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import AggieRingIcon from '@/components/AggieRingIcon'
import Modal from '@/components/Modal'
import { Heart, Users } from 'lucide-react'

const TOTAL_STEPS = 6
const STEP_LABELS = [
  'Personal Info',
  'Academic Info',
  'Family Contact',
  'Financial Info',
  'Involvement & Employment',
  'Story & Consent',
]

export default function FundraisingPage() {
  const supabase = createClient()

  // Auth state
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [pageReady, setPageReady] = useState(false)
  const [existingApplication, setExistingApplication] = useState<{ status: string; created_at: string } | null | undefined>(undefined)

  // Modal & form navigation state
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — Personal Info (name pre-filled from auth)
  const [phone, setPhone] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressZip, setAddressZip] = useState('')
  const [uin, setUin] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')

  // Step 2 — Academic Info
  const [ringType, setRingType] = useState<'large' | 'small' | ''>('')
  const [creditHours, setCreditHours] = useState('')
  const [ringDayCycle, setRingDayCycle] = useState('')
  const [graduationDate, setGraduationDate] = useState('')
  const [degree, setDegree] = useState('')
  const [major, setMajor] = useState('')

  // Step 3 — Family Contact
  const [familyName, setFamilyName] = useState('')
  const [familyAddress, setFamilyAddress] = useState('')
  const [familyEmail, setFamilyEmail] = useState('')
  const [familyPhone, setFamilyPhone] = useState('')

  // Step 4 — Financial Info
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [dependentsCount, setDependentsCount] = useState('')
  const [householdIncome, setHouseholdIncome] = useState('')
  const [courtOrderedPayments, setCourtOrderedPayments] = useState('')
  const [monthlyObligations, setMonthlyObligations] = useState('')

  // Step 5 — Involvement & Employment
  const [communityInvolvement, setCommunityInvolvement] = useState('')
  const [universityInvolvement, setUniversityInvolvement] = useState('')
  const [employmentHistory, setEmploymentHistory] = useState('')

  // Step 6 — Story & Consent
  const [story, setStory] = useState('')
  const [socialMediaConsent, setSocialMediaConsent] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const resolvedEmail =
        user.email ??
        (user.user_metadata?.email as string | undefined) ??
        ''
      setEmail(resolvedEmail.toLowerCase().trim())
      const rawName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        ''
      const parts = rawName.trim().split(' ')
      setFirstName(parts[0] ?? '')
      setLastName(parts.slice(1).join(' '))

      // Check for an existing application
      const res = await fetch('/api/ring-sponsorship', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setExistingApplication(json.application)
      } else {
        setExistingApplication(null)
      }

      setPageReady(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setStep(1)
    setError('')
    setSubmitted(false)
    setPhone('')
    setAddressStreet('')
    setAddressCity('')
    setAddressState('')
    setAddressZip('')
    setUin('')
    setInvoiceNumber('')
    setRingType('')
    setCreditHours('')
    setRingDayCycle('')
    setGraduationDate('')
    setDegree('')
    setMajor('')
    setFamilyName('')
    setFamilyAddress('')
    setFamilyEmail('')
    setFamilyPhone('')
    setMonthlyIncome('')
    setDependentsCount('')
    setHouseholdIncome('')
    setCourtOrderedPayments('')
    setMonthlyObligations('')
    setCommunityInvolvement('')
    setUniversityInvolvement('')
    setEmploymentHistory('')
    setStory('')
    setSocialMediaConsent(false)
  }

  const validateStep = (): string | null => {
    switch (step) {
      case 1:
        if (!firstName.trim() || !lastName.trim()) return 'First and last name are required.'
        if (!phone.trim()) return 'Phone number is required.'
        if (!addressStreet.trim() || !addressCity.trim() || !addressState.trim() || !addressZip.trim())
          return 'Complete address is required.'
        if (!uin.trim()) return 'UIN (Student ID) is required.'
        return null
      case 2:
        if (!ringType) return 'Please select a ring type.'
        if (!creditHours || isNaN(Number(creditHours)) || Number(creditHours) < 0 || !Number.isInteger(Number(creditHours)))
          return 'Valid credit hours are required.'
        if (!ringDayCycle.trim()) return 'Ring Day cycle is required.'
        if (!graduationDate.trim()) return 'Expected graduation date is required.'
        if (!degree.trim()) return 'Degree is required.'
        if (!major.trim()) return 'Major is required.'
        return null
      case 3:
        if (!familyName.trim()) return 'Family member name is required.'
        if (!familyAddress.trim()) return 'Family member address is required.'
        if (!familyEmail.trim()) return 'Family member email is required.'
        if (!familyPhone.trim()) return 'Family member phone is required.'
        return null
      case 4:
        if (!monthlyIncome || isNaN(Number(monthlyIncome)) || Number(monthlyIncome) < 0)
          return 'Valid monthly income is required.'
        if (dependentsCount === '' || isNaN(Number(dependentsCount)) || Number(dependentsCount) < 0)
          return 'Number of dependents is required.'
        return null
      case 5:
        if (!employmentHistory.trim()) return 'Employment history is required.'
        return null
      case 6:
        if (!story.trim()) return 'Please share your story.'
        if (!socialMediaConsent) return 'You must consent to the social media release to submit an application.'
        return null
      default:
        return null
    }
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const handleBack = () => {
    setError('')
    setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setLoading(true)
    try {
      const res = await fetch('/api/ring-sponsorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          address_street: addressStreet.trim(),
          address_city: addressCity.trim(),
          address_state: addressState.trim(),
          address_zip: addressZip.trim(),
          uin: uin.trim(),
          invoice_number: invoiceNumber.trim() || null,
          ring_type: ringType,
          credit_hours: Number(creditHours),
          ring_day_cycle: ringDayCycle.trim(),
          graduation_date: graduationDate.trim(),
          degree: degree.trim(),
          major: major.trim(),
          family_name: familyName.trim(),
          family_address: familyAddress.trim(),
          family_email: familyEmail.trim(),
          family_phone: familyPhone.trim(),
          monthly_income: Number(monthlyIncome),
          dependents_count: Number(dependentsCount),
          household_income: householdIncome ? Number(householdIncome) : null,
          court_ordered_payments: courtOrderedPayments.trim() || null,
          monthly_obligations: monthlyObligations.trim() || null,
          community_involvement: communityInvolvement.trim() || null,
          university_involvement: universityInvolvement.trim() || null,
          employment_history: employmentHistory.trim(),
          story: story.trim(),
          social_media_consent: socialMediaConsent,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Submission failed. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ---- Step renderers ----

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="first_name">First Name</Label>
          <Input id="first_name" maxLength={50} value={firstName} onChange={e => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="last_name">Last Name</Label>
          <Input id="last_name" maxLength={50} value={lastName} onChange={e => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="address_street">Street Address</Label>
        <Input id="address_street" maxLength={100} value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="123 Main St" />
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="space-y-1 col-span-2">
          <Label htmlFor="address_city">City</Label>
          <Input id="address_city" maxLength={60} value={addressCity} onChange={e => setAddressCity(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="address_state">State</Label>
          <Input id="address_state" maxLength={2} value={addressState} onChange={e => setAddressState(e.target.value.toUpperCase())} placeholder="TX" />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="address_zip">ZIP Code</Label>
          <Input id="address_zip" maxLength={10} value={addressZip} onChange={e => setAddressZip(e.target.value)} placeholder="77840" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="uin">UIN (Student ID)</Label>
        <Input id="uin" maxLength={20} value={uin} onChange={e => setUin(e.target.value)} placeholder="9-digit UIN" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invoice_number">
          Ring Office Invoice Number{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input id="invoice_number" maxLength={30} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="If you have already ordered your ring" />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Ring Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['large', 'small'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRingType(type)}
              className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                ringType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              {type === 'large' ? 'Large Ring' : 'Small Ring'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="credit_hours">Credit Hours Completed</Label>
        <Input
          id="credit_hours"
          type="number"
          min={0}
          max={300}
          value={creditHours}
          onChange={e => setCreditHours(e.target.value)}
          placeholder="e.g. 95"
        />
        <p className="text-xs text-muted-foreground">You must have at least 95 credit hours to be eligible for the Aggie Ring.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ring_day_cycle">Ring Day Cycle</Label>
        <Input id="ring_day_cycle" maxLength={30} value={ringDayCycle} onChange={e => setRingDayCycle(e.target.value)} placeholder="e.g. Fall 2025" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="graduation_date">Expected Graduation Date</Label>
        <Input id="graduation_date" maxLength={30} value={graduationDate} onChange={e => setGraduationDate(e.target.value)} placeholder="e.g. May 2026" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="degree">Degree</Label>
        <Input id="degree" maxLength={100} value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. Bachelor of Science" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="major">Major</Label>
        <Input id="major" maxLength={100} value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science" />
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        This information is shared with the Aggies Helping Aggies review board and is not kept confidential.
      </div>
      <div className="space-y-1">
        <Label htmlFor="family_name">Family Member Name</Label>
        <Input id="family_name" maxLength={100} value={familyName} onChange={e => setFamilyName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="family_address">Family Member Address</Label>
        <Input id="family_address" maxLength={200} value={familyAddress} onChange={e => setFamilyAddress(e.target.value)} placeholder="Street, City, State ZIP" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="family_email">Family Member Email</Label>
        <Input id="family_email" type="email" maxLength={100} value={familyEmail} onChange={e => setFamilyEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="family_phone">Family Member Phone</Label>
        <Input id="family_phone" type="tel" maxLength={20} value={familyPhone} onChange={e => setFamilyPhone(e.target.value)} placeholder="(555) 555-5555" />
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="monthly_income">Monthly Income ($)</Label>
        <Input
          id="monthly_income"
          type="number"
          min={0}
          step="0.01"
          value={monthlyIncome}
          onChange={e => setMonthlyIncome(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dependents_count">Number of Dependents</Label>
        <Input
          id="dependents_count"
          type="number"
          min={0}
          value={dependentsCount}
          onChange={e => setDependentsCount(e.target.value)}
          placeholder="0"
        />
      </div>
      {Number(dependentsCount) > 0 && (
        <div className="space-y-1">
          <Label htmlFor="household_income">
            Total Household Income ($){' '}
            <span className="text-muted-foreground font-normal">(if you are a dependent)</span>
          </Label>
          <Input
            id="household_income"
            type="number"
            min={0}
            step="0.01"
            value={householdIncome}
            onChange={e => setHouseholdIncome(e.target.value)}
            placeholder="0.00"
          />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="court_ordered_payments">
          Court-Ordered Payments{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="court_ordered_payments"
          maxLength={500}
          rows={2}
          value={courtOrderedPayments}
          onChange={e => setCourtOrderedPayments(e.target.value)}
          placeholder="Describe any court-ordered monthly payments (child support, restitution, etc.)"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="monthly_obligations">
          Monthly Obligations{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="monthly_obligations"
          maxLength={500}
          rows={2}
          value={monthlyObligations}
          onChange={e => setMonthlyObligations(e.target.value)}
          placeholder="Describe monthly expenses (rent, utilities, car payment, etc.)"
        />
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="community_involvement">
          Community Involvement{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="community_involvement"
          maxLength={800}
          rows={3}
          value={communityInvolvement}
          onChange={e => setCommunityInvolvement(e.target.value)}
          placeholder="Community service, volunteer work, or civic involvement"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="university_involvement">
          University Involvement{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="university_involvement"
          maxLength={800}
          rows={3}
          value={universityInvolvement}
          onChange={e => setUniversityInvolvement(e.target.value)}
          placeholder="Clubs, organizations, sports, or leadership roles at Texas A&M"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="employment_history">Employment History During Student Career</Label>
        <Textarea
          id="employment_history"
          maxLength={800}
          rows={4}
          value={employmentHistory}
          onChange={e => setEmploymentHistory(e.target.value)}
          placeholder="List jobs held while attending Texas A&M (employer, dates, hours/week)"
        />
      </div>
    </div>
  )

  const renderStep6 = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="story">Why Should Aggies Helping Aggies Sponsor You?</Label>
        <Textarea
          id="story"
          maxLength={1500}
          rows={6}
          value={story}
          onChange={e => setStory(e.target.value)}
          placeholder="Share your story, your financial situation, and what the Aggie Ring means to you. This may be used in public fundraising posts."
        />
        <p className="text-xs text-muted-foreground text-right">{story.length}/1500</p>
      </div>
      <div className="rounded-md bg-muted/40 border border-border p-4 space-y-3">
        <p className="text-sm font-semibold">Social Media Release</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          By checking the box below, you authorize Aggies Helping Aggies to use your name, photo, and story in
          fundraising posts on social media platforms (including Facebook and Instagram) and on our website for
          the purpose of raising awareness and funding for your ring sponsorship.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={socialMediaConsent}
            onChange={e => setSocialMediaConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <span className="text-sm">
            I consent to Aggies Helping Aggies using my name, photo, and story for public fundraising purposes.
          </span>
        </label>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      case 6: return renderStep6()
      default: return null
    }
  }

  return (
    <div className="space-y-10 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Fundraising &amp; the Aggie Ring</h1>
        <p className="text-sm text-muted-foreground">
          Two ways to support the Aggie community — fund a student&apos;s ring or keep this platform running.
        </p>
      </div>

      {/* Where your support goes */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Where Your Support Goes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
              <AggieRingIcon style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Aggie Rings &amp; Regalia</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Help cover the cost of a student&apos;s Aggie Ring or graduation regalia — one of the
                most meaningful milestones in the Aggie tradition.
              </p>
            </div>
            <a
              href="https://www.zeffy.com/en-US/donation-form/donate-to-aggies-helping-aggies"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Donate
            </a>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
              <Heart size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Keep the Platform Running</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Aggies Helping Aggies is free for everyone. Donations cover hosting and keep
                the platform available to the Aggie community at no cost.
              </p>
            </div>
            <a
              href="https://www.zeffy.com/en-US/donation-form/donate-to-aggies-helping-aggies"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Donate
            </a>
          </div>

        </div>
        <p className="text-xs text-muted-foreground">
          Donations are processed securely through Zeffy. This is an independent platform and is
          not officially affiliated with Texas A&amp;M University.
        </p>
      </section>

      {/* Sponsorship application */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Apply for Ring Sponsorship</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Texas A&amp;M students in financial need can apply to have their Aggie Ring sponsored
            by Aggies Helping Aggies.
          </p>
        </div>

        {pageReady && existingApplication !== undefined && (
          existingApplication ? (
            <div className={`rounded-lg border p-5 flex items-start gap-3 ${
              existingApplication.status === 'approved'
                ? 'border-green-300 bg-green-500/5 dark:border-green-800'
                : existingApplication.status === 'denied'
                ? 'border-red-300 bg-red-500/5 dark:border-red-800'
                : 'border-blue-300 bg-blue-500/5 dark:border-blue-800'
            }`}>
              <div className="space-y-1">
                <p className={`text-sm font-medium ${
                  existingApplication.status === 'approved'
                    ? 'text-green-700 dark:text-green-400'
                    : existingApplication.status === 'denied'
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-blue-700 dark:text-blue-400'
                }`}>
                  {existingApplication.status === 'approved' && 'Your application has been approved'}
                  {existingApplication.status === 'denied' && 'Your application was not approved'}
                  {existingApplication.status === 'pending' && 'Your application is under review'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {existingApplication.status === 'approved' && 'Congratulations! The Aggies Helping Aggies board has approved your ring sponsorship application. We will be in touch with next steps.'}
                  {existingApplication.status === 'denied' && 'Unfortunately your application was not selected for sponsorship at this time. Thank you for applying.'}
                  {existingApplication.status === 'pending' && 'We have received your application and it is currently being reviewed by the board. We will reach out to your email when a decision has been made.'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(existingApplication.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button disabled className="opacity-50 cursor-not-allowed">
                Apply for Sponsorship
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide rounded-full border border-current px-2 py-0.5">Coming Soon</span>
              </Button>
              <p className="text-sm text-muted-foreground max-w-sm">
                Applications are not yet open for this cycle. Check back soon — we will announce
                when the application window opens.
              </p>
            </div>
          )
        )}
      </section>

      {/* Currently sponsored students — placeholder */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Currently Sponsored Students</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Students whose rings are currently being sponsored by Aggies Helping Aggies.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2">
          <Users size={28} className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No students are currently being sponsored.</p>
        </div>
      </section>

      {/* Application modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Apply for Ring Sponsorship"
        size="xl"
        headerExtra={
          <span className="text-sm text-muted-foreground">
            Step {step} of {TOTAL_STEPS}: {STEP_LABELS[step - 1]}
          </span>
        }
      >
        {submitted ? (
          <div className="space-y-5">
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 text-sm text-green-700 dark:text-green-400">
              Your application was submitted successfully. We will review it and be in touch. Gig &lsquo;em!
            </div>

            {/* Step 2: Document upload — placeholder until Google Workspace is configured */}
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2 opacity-60">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">2</span>
                <p className="text-sm font-medium text-foreground">Upload Supporting Documents</p>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground rounded-full border border-border px-2 py-0.5">Coming Soon</span>
              </div>
              <p className="text-sm text-muted-foreground pl-7">
                You will receive a secure link to upload your supporting documents (tax return, bank statement, and photo ID) directly to our review board. This step will be available shortly.
              </p>
            </div>

            <Button variant="outline" onClick={() => setModalOpen(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step progress bar */}
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i + 1 <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              Applying as <span className="font-medium text-foreground">{email}</span>
            </p>

            {renderCurrentStep()}

            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? () => setModalOpen(false) : handleBack}
              >
                {step === 1 ? 'Cancel' : '← Back'}
              </Button>
              {step < TOTAL_STEPS ? (
                <Button type="button" onClick={handleNext}>
                  Next →
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit Application'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
