// Names an MCP connector the same way on every account.
// A server with a readable name (mcp__notion__..., mcp__plugin_x_fireflies__...) is named for it.
// A claude.ai connector shows a random id as its server (mcp__<random id>__<tool>), and that id differs per
// account, so it is named by its tool names instead. Anything else gets a tidy label, never the raw id.

/** Readable server names, keyed in lower case. */
const NAMED: Record<string, string> = {
  'google-workspace': 'Google Workspace',
  gmail: 'Gmail',
  'google-calendar': 'Google Calendar',
  'google-drive': 'Google Drive',
  'chat-relay': 'Chat Relay',
  handoff: 'Handoff',
  vidiq: 'vidIQ',
  apify: 'Apify',
  'claude-in-chrome': 'Chrome',
  claude_browser: 'Browser',
  fireflies: 'Fireflies',
  posthog: 'PostHog',
  pipedrive: 'Pipedrive',
  pandadoc: 'PandaDoc',
  firecrawl: 'Firecrawl',
  attio: 'Attio',
  composio: 'Composio',
  figma: 'Figma',
  stripe: 'Stripe',
  shopify: 'Shopify',
  notion: 'Notion',
  slack: 'Slack',
  calendly: 'Calendly',
  youtube: 'YouTube',
  kit: 'Kit',
  circle: 'Circle',
  'circle-community': 'Circle',
  supabase: 'Supabase',
  vercel: 'Vercel',
  make: 'Make',
  higgsfield: 'Higgsfield',
  github: 'GitHub',
  linear: 'Linear',
  hubspot: 'HubSpot',
  reddit: 'Reddit',
}

/** Tool name patterns, first match wins. Prefixed families first, then the exact names one app uses. */
const BY_TOOL: [RegExp, string][] = [
  [/^fireflies_/i, 'Fireflies'],
  [/^notion-/i, 'Notion'],
  [/^vidiq_/i, 'vidIQ'],
  [/^slack_/i, 'Slack'],
  [/^composio_/i, 'Composio'],
  [/^(ads_studio|ai_influencer|scene_builder_3d|shorts_studio|tiktok)_/i, 'Higgsfield'],
  [/^ads_/i, 'Meta Ads'],
  [/^(availability|event_types|meetings|routing_forms|scheduling_links|shares|locations|users|organizations)-|calendly/i, 'Calendly'],
  [
    /^(search_threads|get_thread|get_message|list_drafts|get_draft|create_draft|update_draft|delete_draft|list_labels|create_label|update_label|delete_label|(un)?label_(thread|message)|(un)?trash_(thread|message)|(un)?mark_(thread|message)_spam|apply_sensitive_(thread|message)_label|update_message_labels|forward|reply)$/i,
    'Gmail',
  ],
  [/^(list_calendars|respond_to_event|suggest_time|search_events)$/i, 'Google Calendar'],
  [
    /^(list_recent_files|search_files|read_file_content|download_file_content|get_file_metadata|get_file_permissions|share_file|trash_file|copy_file)$/i,
    'Google Drive',
  ],
  [/^(get_spreadsheet|get_values|update_values|append_values|batch_clear_values|update_formulas|insert_dimension|update_spreadsheet|copy_sheet_to_another_spreadsheet)$/i, 'Google Sheets'],
  [/(subscriber|broadcast|sequence|landing_page|snippet|growth_stats|email_template|creator_profile|email_stats)/i, 'Kit'],
  [/(community_member|space_group|(^|_)spaces?(_|$)|space_member|course_(lesson|section)|access_group|member_tag|tagged_member|live_room|gamification|paywall|flagged_content|filter_kit|post_summary|advanced_search)/i, 'Circle'],
  [/(^|-)actors?(-|$)|apify|(^|-)dataset(-|$)|key-value-store/i, 'Apify'],
  [/-records?(-|$)|^semantic-search-|call-recording|^run-basic-report$|-workspace-(members|teams)$|-list-entry-|attribute-definitions$/i, 'Attio'],
  [/^(scenarios?|scenario-[a-z-]+|data-stores?|data-store-records|data-structures?|hooks|hook-[a-z-]+|executions|credential-requests|app-modules?|connections|connection-[a-z-]+)_/i, 'Make'],
  [/^(apply_migration|execute_sql|list_migrations|list_tables|list_extensions|generate_typescript_types|get_advisors|get_publishable_keys|get_project_url|deploy_edge_function|list_edge_functions|get_edge_function|create_edge_function_secret)$/i, 'Supabase'],
  [/deployment|vercel|edge_config|project_domain|sandboxes|named_sandbox|toolbar_|rolling_release|_drains?$|kms_/i, 'Vercel'],
  [/^(get_design_context|get_figjam|use_figma|get_figma_skill|get_variable_defs|create_design_system_rules|search_design_system|send_code_to_figma|add_code_connect_map|get_motion_context)$|code_connect|shader|generative_plugin|^weave_/i, 'Figma'],
  [/^(find_(person|company|decision_maker)_emails?|verify_email|report_bad_email)$/i, 'AnyMailFinder'],
  [/^(match|enrich)-(business|prospects)$|^fetch-(entities|businesses-events|prospects-events|entities-statistics)$/i, 'Vibe Prospecting'],
  [/^(getTranscripts|getVideoDetails|searchVideos|getChannelStatistics|getVideoComments|getTrendingVideos|getChannelTopVideos|getVideoCategories)$/, 'YouTube'],
]

/** The label for a connector whose name cannot be told from its server or its tools. */
export const OTHER = 'Connector'

/** Every name this file can give, so a caller can set up one handler per name. */
export const CONNECTOR_NAMES: readonly string[] = [...new Set([...Object.values(NAMED), ...BY_TOOL.map(r => r[1]), OTHER])]

const titleCase = (s: string) =>
  s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')

/** A random id rather than a name: 8 hex characters, a dash, then more hex and dashes. */
export const isIdServer = (server: string) => /^[0-9a-f]{8}-[0-9a-f-]*$/i.test(server)

// Servers already named by one of their tools, so a tool that fits no pattern still gets the name.
const known = new Map<string, string>()

/** The server and tool parts of an MCP tool name: mcp__<server>__<tool>. */
export function splitTool(tool: string): { server: string; name: string } {
  const [, server = '', ...rest] = tool.split('__')
  return { server, name: rest.join('__') }
}

/** The friendly name for an MCP server, given one of its tool names. */
export function connectorName(server: string, toolName: string): string {
  if (!isIdServer(server)) {
    let name = server.replace(/^plugin_[^_]+_/, '').replace(/^claude_ai_/i, '')
    if (!name) name = server
    return NAMED[name.toLowerCase()] ?? titleCase(name)
  }
  const hit = BY_TOOL.find(([re]) => re.test(toolName))
  if (hit) {
    known.set(server, hit[1])
    return hit[1]
  }
  return known.get(server) ?? OTHER
}
