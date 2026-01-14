export type ToolName =
  | "get_quote"
  | "get_news"
  | "get_today_brief"
  | "add_to_watchlist"
  | "remove_from_watchlist"
  | "get_watchlist"
  | "get_movers"
  | "get_top_movers"
  | "get_user_profile";

export type ToolArgs = Record<string, any>;
