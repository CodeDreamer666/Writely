export type Side = "left" | "right";
export type Point = [x: number, y: number];
export type Anchor = "top" | "right" | "bottom" | "left";

/** A logical range in the manuscript, kept in document positions rather than screen coordinates. */
export type ConnectorTarget = {
    kind: "essay" | "word" | "text" | "paragraph";
    from?: number;
    to?: number;
    quote: string;
    orphaned?: boolean;
};

type Connector = {
    id: string;
    anchor?: Anchor;
    target: ConnectorTarget;
};

export type Card = {
    id: string;
    text: string;
    /** Rich text; plain text remains available for layout and accessible labels. */
    html?: string;
    placement?: "margin" | "free";
    side?: Side;
    /** Margin cards: relative x. Free cards: fraction of the free width. */
    x?: number;
    y?: number;
    /** Free cards: distance from the page centre. */
    offset?: number;
    opacity: number;
    bg: string;
    fg: string;
    connectors?: Connector[];
    collapsed?: boolean;
    leafPosition?: { side?: Side; x: number; y: number };
};

export type Draft = {
    id: string;
    name: string;
    html: string;
    title: string;
    time: number;
    goal?: string;
    baseline?: string;
};

export type Check = {
    id: string;
    text: string;
    done: boolean;
    sourceDefaultId?: string;
};

export type RevisionSession = {
    checkId: string;
    goal: string;
    baseline: string;
    workingId: string;
    started: number;
};

export type WritingDocument = {
    id: string;
    title: string;
    html: string;
    updated: number;
    cards: Card[];
    hidden: boolean;
    checks: Check[];
    drafts: Draft[];
    session: RevisionSession | null;
    universalProgress?: Record<string, boolean>;
};

export type RevisionGoal = { id: string; text: string };

export type WorkspaceData = {
    /** Next colour in the creation cycle; independent of existing card order/count. */
    nextThoughtColour?: number;
    docs: WritingDocument[];
    active: string;
    defaultRevisionGoals: RevisionGoal[];
    revisionSchemaVersion?: number;
};

/** Workspace data from before universal revision goals (schema version 2). */
export type UnmigratedWorkspace = Omit<
    WorkspaceData,
    "defaultRevisionGoals"
> & {
    defaultRevisionGoals?: RevisionGoal[];
};
