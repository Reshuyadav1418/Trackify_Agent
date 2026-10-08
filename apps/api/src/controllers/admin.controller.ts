import { Request, Response, NextFunction } from 'express';
import { UserModel, TeamModel, ProjectModel, TaskModel, AuditLogModel } from '../models';
import { hashPassword } from '../services/auth.service';
import { AppError } from '../middleware/error.middleware';
import { logAudit } from '../services/audit.service';


// --- Users CRUD ---
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await UserModel.find().select('-password -refreshTokenHashes').populate('teamId', 'name');
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, role, teamId } = req.body;

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    const hashedPassword = await hashPassword(password);

    const user = await UserModel.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      teamId: teamId || null,
    });

    if (teamId) {
      await TeamModel.findByIdAndUpdate(teamId, { $addToSet: { memberIds: user._id } });
    }

    if (req.user) {
      await logAudit({
        actorId: req.user.userId,
        action: 'CREATE_USER',
        targetEntity: 'User',
        targetId: user._id.toString(),
        ipAddress: req.ip,
      });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, teamId, password } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (teamId !== undefined) updateData.teamId = teamId || null;
    if (password) updateData.password = await hashPassword(password);

    const user = await UserModel.findByIdAndUpdate(id, updateData, { new: true }).select(
      '-password -refreshTokenHashes'
    );
    if (!user) throw new AppError('User not found', 404);

    res.json({ message: 'User updated', user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await UserModel.findByIdAndDelete(id);
    if (!user) throw new AppError('User not found', 404);

    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

// --- Teams CRUD ---
export const getTeams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teams = await TeamModel.find().populate('managerId', 'name email').populate('memberIds', 'name email');
    res.json({ teams });
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, managerId, memberIds } = req.body;
    const team = await TeamModel.create({
      name,
      managerId: managerId || null,
      memberIds: memberIds || [],
    });
    res.status(201).json({ message: 'Team created', team });
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const team = await TeamModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!team) throw new AppError('Team not found', 404);
    res.json({ message: 'Team updated', team });
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const team = await TeamModel.findByIdAndDelete(id);
    if (!team) throw new AppError('Team not found', 404);
    res.json({ message: 'Team deleted' });
  } catch (error) {
    next(error);
  }
};

// --- Projects CRUD ---
export const getProjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projects = await ProjectModel.find().populate('teamIds', 'name');
    res.json({ projects });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await ProjectModel.create(req.body);
    res.status(201).json({ message: 'Project created', project });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await ProjectModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!project) throw new AppError('Project not found', 404);
    res.json({ message: 'Project updated', project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await ProjectModel.findByIdAndDelete(id);
    if (!project) throw new AppError('Project not found', 404);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
};

// --- Tasks CRUD ---
export const getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tasks = await TaskModel.find().populate('projectId', 'name').populate('assignedUserIds', 'name email');
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await TaskModel.create(req.body);
    res.status(201).json({ message: 'Task created', task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await TaskModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!task) throw new AppError('Task not found', 404);
    res.json({ message: 'Task updated', task });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await TaskModel.findByIdAndDelete(id);
    if (!task) throw new AppError('Task not found', 404);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

// --- Audit Logs ---
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await AuditLogModel.find()
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ auditLogs: logs });
  } catch (error) {
    next(error);
  }
};



