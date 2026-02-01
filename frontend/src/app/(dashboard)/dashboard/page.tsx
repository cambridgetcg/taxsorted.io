"use client";

import { useState } from "react";
import {
  EntityHeader,
  AttentionRequired,
  UpcomingDeadlines,
  RecentSubmissions,
  ComplianceScore,
  HMRCConnections,
  QuickActions,
} from "@/components/dashboard";
import {
  mockDashboardData,
  mockEntities,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const [currentEntityId, setCurrentEntityId] = useState(mockDashboardData.entity.id);

  // In a real app, this would be fetched based on currentEntityId
  const data = mockDashboardData;
  const currentEntity = mockEntities.find((e) => e.id === currentEntityId) || data.entity;

  const handleEntityChange = (entityId: string) => {
    setCurrentEntityId(entityId);
    // In a real app, this would trigger a data refetch
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Zone A: Entity Header */}
          <EntityHeader
            entity={currentEntity}
            entities={mockEntities}
            onEntityChange={handleEntityChange}
          />

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Zone B: Main Content (8 columns on desktop) */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* B1: Attention Required */}
              <AttentionRequired filings={data.attentionFilings} />

              {/* B2: Upcoming Deadlines */}
              <UpcomingDeadlines deadlineGroups={data.upcomingDeadlines} />

              {/* B3: Recent Submissions */}
              <RecentSubmissions submissions={data.recentSubmissions} />
            </div>

            {/* Zone C: Sidebar (4 columns on desktop) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* C1: Compliance Score */}
              <ComplianceScore data={data.complianceScore} />

              {/* C2: HMRC Connections */}
              <HMRCConnections connections={data.connections} />

              {/* C3: Quick Actions */}
              <QuickActions actions={data.quickActions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
