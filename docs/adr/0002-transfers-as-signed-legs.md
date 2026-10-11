# Transfers are two signed legs, not income plus expense

A Transfer is two `transactions` rows sharing a `transfer_group_id`, with `type = transfer`, signed `amount_cents` (outflow negative, inflow positive), no category, and a constraint that a group has exactly two legs summing to zero. Income and expense rows stay positive and take their direction from `type`. We rejected recording transfers as an expense plus an income because it inflates monthly totals, and a separate `transfers` table because every balance query would need a union. Editing or deleting one leg changes the whole group.
