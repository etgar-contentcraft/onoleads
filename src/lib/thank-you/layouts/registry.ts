/**
 * Layout registry — maps a template's `layout_id` to a React component.
 *
 * Adding a new layout:
 *   1. Create the component (in this folder or anywhere, must accept LayoutContext)
 *   2. Import it here
 *   3. Add an entry to LAYOUT_REGISTRY
 *   4. Add the layout_id to the TyLayoutId union in `src/lib/types/thank-you-templates.ts`
 */

import type { TyLayoutId } from "@/lib/types/thank-you-templates";
import type { LayoutComponent } from "./shared";
import { ClassicDarkLayout } from "./classic-dark";
import {
  CalendarFocusLayout,
  CelebrationLayout,
  MinimalLightLayout,
  MultiChannelLayout,
  PersonalAdvisorLayout,
  ResourceLibraryLayout,
  SocialProofLayout,
  UrgencyCohortLayout,
  VideoWelcomeLayout,
} from "./other-layouts";

export const LAYOUT_REGISTRY: Record<TyLayoutId, LayoutComponent> = {
  classic_dark: ClassicDarkLayout,
  minimal_light: MinimalLightLayout,
  celebration: CelebrationLayout,
  personal_advisor: PersonalAdvisorLayout,
  calendar_focus: CalendarFocusLayout,
  video_welcome: VideoWelcomeLayout,
  resource_library: ResourceLibraryLayout,
  social_proof: SocialProofLayout,
  urgency_cohort: UrgencyCohortLayout,
  multi_channel: MultiChannelLayout,
};

/** Get the layout component for a given layout_id, falling back to classic_dark */
export function getLayout(layoutId: string): LayoutComponent {
  return LAYOUT_REGISTRY[layoutId as TyLayoutId] || LAYOUT_REGISTRY.classic_dark;
}
