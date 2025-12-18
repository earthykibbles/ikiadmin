import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const authCheck = await requirePermission(request, RESOURCE_TYPES.FINANCE, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    // Fetch budgets with incomes
    const budgetsSnapshot = await db.collection('users').doc(userId).collection('budgets').get();

    const budgets = await Promise.all(
      budgetsSnapshot.docs.map(async (budgetDoc) => {
        const budgetData = budgetDoc.data();

        // Get categories for this budget
        const categoriesSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('budgets')
          .doc(budgetDoc.id)
          .collection('categories')
          .get();

        const categories = categoriesSnapshot.docs.map((catDoc) => ({
          id: catDoc.id,
          ...catDoc.data(),
        }));

        // Get expenses for this budget
        const expensesSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('budgets')
          .doc(budgetDoc.id)
          .collection('expenses')
          .orderBy('date', 'desc')
          .limit(100) // Limit to recent 100 expenses
          .get();

        const expenses = expensesSnapshot.docs.map((expDoc) => {
          const expData = expDoc.data();
          let dateValue = null;
          if (expData.date) {
            if (expData.date.toDate) {
              dateValue = expData.date.toDate().toISOString();
            } else if (expData.date instanceof Date) {
              dateValue = expData.date.toISOString();
            } else if (typeof expData.date === 'string') {
              dateValue = expData.date;
            }
          }
          return {
            id: expDoc.id,
            ...expData,
            date: dateValue,
          };
        });

        // Parse incomes from budget data
        const incomes = (budgetData.incomes || []).map((income: any) => {
          let addedAtValue = null;
          if (income.addedAt) {
            if (income.addedAt.toDate) {
              addedAtValue = income.addedAt.toDate().toISOString();
            } else if (income.addedAt instanceof Date) {
              addedAtValue = income.addedAt.toISOString();
            } else if (typeof income.addedAt === 'string') {
              addedAtValue = income.addedAt;
            }
          }
          return {
            ...income,
            addedAt: addedAtValue,
          };
        });

        let createdAtValue = null;
        if (budgetData.createdAt) {
          if (budgetData.createdAt.toDate) {
            createdAtValue = budgetData.createdAt.toDate().toISOString();
          } else if (budgetData.createdAt instanceof Date) {
            createdAtValue = budgetData.createdAt.toISOString();
          } else if (typeof budgetData.createdAt === 'string') {
            createdAtValue = budgetData.createdAt;
          }
        }

        return {
          id: budgetDoc.id,
          startDay: budgetData.startDay || 1,
          createdAt: createdAtValue,
          incomes,
          categories,
          expenses,
          totalIncome: incomes.reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0),
          totalExpenses: expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0),
        };
      })
    );

    // Fetch debts
    const debtsSnapshot = await db.collection('users').doc(userId).collection('debts').get();

    const debts = await Promise.all(
      debtsSnapshot.docs.map(async (debtDoc) => {
        const debtData = debtDoc.data();

        // Get payments for this debt
        const paymentsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('debts')
          .doc(debtDoc.id)
          .collection('payments')
          .orderBy('paidAt', 'desc')
          .get();

        const payments = paymentsSnapshot.docs.map((payDoc) => {
          const payData = payDoc.data();
          let paidAtValue = null;
          if (payData.paidAt) {
            if (payData.paidAt.toDate) {
              paidAtValue = payData.paidAt.toDate().toISOString();
            } else if (payData.paidAt instanceof Date) {
              paidAtValue = payData.paidAt.toISOString();
            } else if (typeof payData.paidAt === 'string') {
              paidAtValue = payData.paidAt;
            }
          }
          return {
            id: payDoc.id,
            ...payData,
            paidAt: paidAtValue,
          };
        });

        let dueDateValue = null;
        if (debtData.dueDate) {
          if (debtData.dueDate.toDate) {
            dueDateValue = debtData.dueDate.toDate().toISOString();
          } else if (debtData.dueDate instanceof Date) {
            dueDateValue = debtData.dueDate.toISOString();
          } else if (typeof debtData.dueDate === 'string') {
            dueDateValue = debtData.dueDate;
          }
        }

        return {
          id: debtDoc.id,
          lenderName: debtData.lenderName || '',
          loanAmount: debtData.loanAmount || 0,
          repaymentPeriod: debtData.repaymentPeriod || 0,
          annualInterestRate: debtData.annualInterestRate || 0,
          monthlyInstallment: debtData.monthlyInstallment || 0,
          repaymentMethod: debtData.repaymentMethod || 0,
          priority: debtData.priority || 0,
          dueDate: dueDateValue,
          paidAmount: debtData.paidAmount || 0,
          totalInterest: debtData.totalInterest || 0,
          payments,
        };
      })
    );

    // Fetch goals
    const goalsSnapshot = await db.collection('users').doc(userId).collection('goals').get();

    const goals = await Promise.all(
      goalsSnapshot.docs.map(async (goalDoc) => {
        const goalData = goalDoc.data();

        // Get contributions for this goal
        const contributionsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('goals')
          .doc(goalDoc.id)
          .collection('contributions')
          .orderBy('contributedAt', 'desc')
          .get();

        const contributions = contributionsSnapshot.docs.map((contDoc) => {
          const contData = contDoc.data();
          let contributedAtValue = null;
          if (contData.contributedAt) {
            if (contData.contributedAt.toDate) {
              contributedAtValue = contData.contributedAt.toDate().toISOString();
            } else if (contData.contributedAt instanceof Date) {
              contributedAtValue = contData.contributedAt.toISOString();
            } else if (typeof contData.contributedAt === 'string') {
              contributedAtValue = contData.contributedAt;
            }
          }
          return {
            id: contDoc.id,
            ...contData,
            contributedAt: contributedAtValue,
          };
        });

        let deadlineValue = null;
        if (goalData.deadline) {
          if (goalData.deadline.toDate) {
            deadlineValue = goalData.deadline.toDate().toISOString();
          } else if (goalData.deadline instanceof Date) {
            deadlineValue = goalData.deadline.toISOString();
          } else if (typeof goalData.deadline === 'string') {
            deadlineValue = goalData.deadline;
          }
        }

        let lastContributionDateValue = null;
        if (goalData.lastContributionDate) {
          if (goalData.lastContributionDate.toDate) {
            lastContributionDateValue = goalData.lastContributionDate.toDate().toISOString();
          } else if (goalData.lastContributionDate instanceof Date) {
            lastContributionDateValue = goalData.lastContributionDate.toISOString();
          } else if (typeof goalData.lastContributionDate === 'string') {
            lastContributionDateValue = goalData.lastContributionDate;
          }
        }

        return {
          id: goalDoc.id,
          name: goalData.name || '',
          targetAmount: goalData.targetAmount || 0,
          deadline: deadlineValue,
          monthlyContribution: goalData.monthlyContribution || 0,
          currentAmount: goalData.currentAmount || 0,
          streak: goalData.streak || 0,
          lastContributionDate: lastContributionDateValue,
          contributions,
          progress:
            goalData.targetAmount > 0 ? (goalData.currentAmount / goalData.targetAmount) * 100 : 0,
        };
      })
    );

    // Calculate summary statistics
    const totalDebt = debts.reduce((sum, debt) => sum + (debt.loanAmount - debt.paidAmount), 0);
    const totalGoals = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const totalBudgetIncome = budgets.reduce((sum, budget) => sum + budget.totalIncome, 0);
    const totalBudgetExpenses = budgets.reduce((sum, budget) => sum + budget.totalExpenses, 0);

    return NextResponse.json({
      budgets,
      debts,
      goals,
      summary: {
        totalBudgets: budgets.length,
        totalDebts: debts.length,
        totalGoals: goals.length,
        totalDebt,
        totalGoalsAmount: totalGoals,
        totalIncome: totalBudgetIncome,
        totalExpenses: totalBudgetExpenses,
        netBalance: totalBudgetIncome - totalBudgetExpenses,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching finance data:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch finance data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
