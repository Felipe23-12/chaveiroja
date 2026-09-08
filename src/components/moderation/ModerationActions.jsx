import React from "react";
import BlockActionButton from "@/components/moderation/BlockActionButton";
import ReportDialog from "@/components/moderation/ReportDialog";

export default function ModerationActions(props) {
  return <div className="flex flex-wrap gap-2">
    <BlockActionButton targetUserId={props.targetUserId} targetType={props.targetType} targetName={props.targetName} onChanged={props.onBlocked} />
    {props.allowReport !== false && <ReportDialog {...props} />}
  </div>;
}