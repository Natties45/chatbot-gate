import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireAuth, hashPassword } from '../../../lib/auth';

// Helper to filter user properties sent to client
function sanitizeUser(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate and check role
    await requireAuth(['admin']);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users.map(sanitizeUser));
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Users API GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { username, password, role, status } = await request.json();

    if (!username || !password || !role || !status) {
      return NextResponse.json(
        { error: 'All fields are required (username, password, role, status)' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        role,
        status,
      },
    });

    return NextResponse.json(sanitizeUser(newUser), { status: 211 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Users API POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { role, status, password } = await request.json();

    // Verify user exists
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (password && password.trim() !== '') {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // If disabling a user, terminate all active sessions for them
    if (status === 'disabled') {
      await prisma.session.deleteMany({
        where: { userId: id },
      });
    }

    return NextResponse.json(sanitizeUser(updatedUser));
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Users API PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(['admin']);
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the user has created any cases. If they have, we disable instead of hard deleting.
    const caseCount = await prisma.case.count({
      where: { userId: id }
    });

    if (caseCount > 0) {
      // Soft-delete: update status to disabled and clear sessions
      await prisma.user.update({
        where: { id },
        data: { status: 'disabled' }
      });
      await prisma.session.deleteMany({
        where: { userId: id }
      });
      return NextResponse.json({ success: true, message: 'User has associated cases. Disabled account instead of deleting.' });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Users API DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
