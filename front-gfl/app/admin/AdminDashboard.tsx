"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/ui/dialog";
import { Input } from "components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import { MoreVertical, Ban, CheckCircle, XCircle, Eye } from "lucide-react";
import type {
  GuideReportAdmin,
  CommentReportAdmin,
  GuideBanAdmin,
  ReportStatus,
  GuideReportsPaginated,
  CommentReportsPaginated,
  GuideBansPaginated,
} from "types/admin";
import { fetchApiUrl } from "utils/generalUtils";

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const variants: Record<ReportStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "default",
    resolved: "secondary",
    dismissed: "outline",
  };

  return <Badge variant={variants[status]}>{status}</Badge>;
}

export default function AdminDashboard() {
  const [guideReports, setGuideReports] = useState<GuideReportAdmin[]>([]);
  const [commentReports, setCommentReports] = useState<CommentReportAdmin[]>([]);
  const [bans, setBans] = useState<GuideBanAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  // Ban dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banUserId, setBanUserId] = useState<string>("");
  const [banReason, setBanReason] = useState("");
  const [banUserName, setBanUserName] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter && statusFilter !== "all" ? { status: statusFilter } : {};

      const [guideData, commentData, bansData] = await Promise.all([
        fetchApiUrl("/admin/reports/guides", { params }).catch(() => null),
        fetchApiUrl("/admin/reports/comments", { params }).catch(() => null),
        fetchApiUrl("/admin/bans", { params: { active_only: "true" } }).catch(() => null),
      ]);

      if (guideData) {
        setGuideReports((guideData as GuideReportsPaginated).reports || []);
      }
      if (commentData) {
        setCommentReports((commentData as CommentReportsPaginated).reports || []);
      }
      if (bansData) {
        setBans((bansData as GuideBansPaginated).bans || []);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateReportStatus = async (
    type: "guides" | "comments",
    reportId: string,
    status: ReportStatus
  ) => {
    try {
      await fetchApiUrl(`/admin/reports/${type}/${reportId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update report status:", error);
    }
  };

  const banUser = async () => {
    if (!banUserId || !banReason) return;

    try {
      await fetchApiUrl(`/admin/users/${banUserId}/guide-ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason }),
      });
      setBanDialogOpen(false);
      setBanReason("");
      setBanUserId("");
      setBanUserName("");
      fetchData();
    } catch (error) {
      console.error("Failed to ban user:", error);
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      await fetchApiUrl(`/admin/users/${userId}/guide-ban`, {
        method: "DELETE",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to unban user:", error);
    }
  };

  const openBanDialog = (userId?: string, userName?: string | null) => {
    setBanUserId(userId || "");
    setBanUserName(userName || "");
    setBanDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="guide-reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="guide-reports">
            Guide Reports ({guideReports.length})
          </TabsTrigger>
          <TabsTrigger value="comment-reports">
            Comment Reports ({commentReports.length})
          </TabsTrigger>
          <TabsTrigger value="bans">Banned Users ({bans.length})</TabsTrigger>
        </TabsList>

        <div className="mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="guide-reports">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guide</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guideReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No guide reports found
                  </TableCell>
                </TableRow>
              ) : (
                guideReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.guide_title || "Deleted Guide"}</div>
                        <div className="text-sm text-muted-foreground">
                          {report.guide_map_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{report.reporter_name || report.reporter_id}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium">{report.reason}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {report.details}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status as ReportStatus} />
                    </TableCell>
                    <TableCell>{formatDate(report.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateReportStatus("guides", report.id, "resolved")}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateReportStatus("guides", report.id, "dismissed")}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Dismiss
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/maps/${report.guide_map_name}/guides/${report.guide_id}`, "_blank")}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Guide
                          </DropdownMenuItem>
                          {report.guide_author_id && (
                            <DropdownMenuItem
                              onClick={() => openBanDialog(report.guide_author_id!, report.guide_author_name)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Ban Guide Author
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="comment-reports">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comment</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commentReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No comment reports found
                  </TableCell>
                </TableRow>
              ) : (
                commentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {report.comment_content || "Deleted Comment"}
                      </div>
                    </TableCell>
                    <TableCell>{report.reporter_name || report.reporter_id}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium">{report.reason}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {report.details}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status as ReportStatus} />
                    </TableCell>
                    <TableCell>{formatDate(report.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateReportStatus("comments", report.id, "resolved")}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateReportStatus("comments", report.id, "dismissed")}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Dismiss
                          </DropdownMenuItem>
                          {report.comment_author_id && (
                            <DropdownMenuItem
                              onClick={() => openBanDialog(report.comment_author_id!, report.comment_author_name)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Ban Comment Author
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="bans">
          <div className="mb-4">
            <Button onClick={() => openBanDialog()}>
              <Ban className="mr-2 h-4 w-4" />
              Ban User
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Banned By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No active bans
                  </TableCell>
                </TableRow>
              ) : (
                bans.map((ban) => (
                  <TableRow key={ban.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={ban.user_avatar || undefined} />
                          <AvatarFallback>
                            {ban.user_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{ban.user_name || ban.user_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{ban.reason}</TableCell>
                    <TableCell>{ban.banned_by_name || ban.banned_by}</TableCell>
                    <TableCell>{formatDate(ban.created_at)}</TableCell>
                    <TableCell>
                      {ban.expires_at ? formatDate(ban.expires_at) : "Permanent"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unbanUser(ban.user_id)}
                      >
                        Unban
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User from Guides</DialogTitle>
            <DialogDescription>
              {banUserName
                ? `Ban ${banUserName} from creating guides and comments.`
                : "Ban a user from creating guides and comments."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Steam ID</label>
              <Input
                value={banUserId}
                onChange={(e) => setBanUserId(e.target.value)}
                placeholder="Enter Steam ID (e.g., 76561198012345678)"
                className="mt-2"
                disabled={!!banUserName}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter ban reason..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={banUser} disabled={!banReason || !banUserId}>
              <Ban className="mr-2 h-4 w-4" />
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
