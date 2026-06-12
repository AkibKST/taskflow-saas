import { create } from "zustand";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  members?: ProjectMember[];
  [key: string]: any;
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  members: ProjectMember[];
  onlineUserIds: string[];
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (updated: Project) => void;
  setCurrentProject: (project: Project | null) => void;
  setOnlineUserIds: (onlineUserIds: string[]) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  members: [],
  onlineUserIds: [],

  setProjects: (projects: Project[]) => set({ projects }),
  addProject: (project: Project) =>
    set((s) => ({ projects: [project, ...s.projects] })),
  updateProject: (updated: Project) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
      currentProject:
        s.currentProject?.id === updated.id ? updated : s.currentProject,
    })),
  setCurrentProject: (project: Project | null) =>
    set({ currentProject: project, members: project?.members ?? [] }),
  setOnlineUserIds: (onlineUserIds: string[]) => set({ onlineUserIds }),
}));
