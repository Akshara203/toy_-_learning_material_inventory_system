USE `toy_inventory_db`;

-- Populate Users
-- Passwords: director -> admin123, miss_emily -> teacher123, store_bob -> manager123
INSERT INTO `users` (`id`, `username`, `password_hash`, `email`, `role`, `created_at`) VALUES
(1, 'director', '$2b$10$nE8VG/93jB.mKQA4pJP7HOk5LxmjCwg3vvhXePk2ey9iYIjQoS/rW', 'director@preschool.com', 'Admin', NOW()),
(2, 'miss_emily', '$2b$10$meI2KNfpe0p889QMv1.TEOA1ocEgWbBwdXrP0rQ01KO.ZRY8NIqUO', 'emily@preschool.com', 'Teacher', NOW()),
(3, 'store_bob', '$2b$10$gYu/z2YX.duvCPVYgtW6VOPtNKPLXv0RUTUiBlpRw6gbvYsPAzSmS', 'bob@preschool.com', 'Store Manager', NOW())
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Populate Categories
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Toys & Games', 'Creative and motor-skill building toys, puzzles, and board games'),
(2, 'Books & Media', 'Reading books, picture books, and digital educational assets'),
(3, 'Worksheets & Printables', 'Coloring exercises, alphabet tracing sheets, and printouts'),
(4, 'Art & Classroom Materials', 'Crayons, child-safe paint, clay, papers, and scissors'),
(5, 'Activity & Learning Kits', 'Science kits, math counting kits, and tactile puzzle kits')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Populate Inventory Items
INSERT INTO `inventory_items` (`id`, `name`, `category_id`, `sku`, `description`, `quantity`, `min_required`, `location`, `supplier`, `created_at`) VALUES
(1, 'Wooden Shape Sorter Block', 1, 'TOY-WD-SORT', 'High-quality pine-wood block sorter for spatial awareness.', 12, 5, 'Shelf A2 - Toys', 'EarlyYears Supply Co.', NOW()),
(2, 'Dr. Seuss Cat in the Hat', 2, 'BOK-DS-CATH', 'Classic reading book for young readers.', 8, 3, 'Library Corner - Box 1', 'KidsBooks Distributor', NOW()),
(3, 'Washable Color Markers (12-Pack)', 4, 'ART-CR-MARK', 'Non-toxic, safe washable markers.', 25, 10, 'Art Cabinet - Shelf B', 'Crayola Depot', NOW()),
(4, 'Alphabet Animal Coloring Sheets', 3, 'WKS-AL-COLO', 'Printable animal character letter coloring exercises.', 150, 50, 'File Drawer 3', 'CreativeDay Care Internal', NOW()),
(5, 'Counting Sheep Mathematics Kit', 5, 'KIT-MA-COUN', 'A kit containing educational tactile sheep figurines and cards for arithmetic.', 2, 4, 'Math Lab - Box B', 'STEM Educators Ltd', NOW()),
(6, 'Child-Safe Plastic Scissors', 4, 'ART-SC-SAFE', 'Blunt metal blades encased in colorful child-safe plastic.', 4, 8, 'Art Cabinet - Drawer A', 'SchoolMart', NOW())
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Populate Stock Movements
INSERT INTO `stock_movements` (`id`, `item_id`, `type`, `quantity`, `reason`, `user_id`, `created_at`) VALUES
(1, 1, 'In', 12, 'Initial Procurement Stock', 3, NOW()),
(2, 2, 'In', 10, 'Initial Procurement Stock', 3, NOW()),
(3, 2, 'Out', 2, 'Damaging check out', 2, NOW()),
(4, 3, 'In', 25, 'Initial Store Stocking', 3, NOW()),
(5, 4, 'In', 150, 'Internal duplicating run', 3, NOW()),
(6, 5, 'In', 2, 'Initial Stocking - Low Inventory', 3, NOW()),
(7, 6, 'In', 6, 'Initial Stocking', 3, NOW()),
(8, 6, 'Out', 2, 'Broken scissors discarded', 3, NOW())
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Populate Damaged Items
INSERT INTO `damaged_items` (`id`, `item_id`, `quantity`, `reported_by`, `notes`, `status`, `created_at`) VALUES
(1, 2, 2, 2, 'Pages torn in the nursery classroom by toddlers.', 'Reported', NOW()),
(2, 6, 2, 3, 'Plastic hinges snapped, discarded due to sharp edges.', 'Discarded', NOW())
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Populate Reorder Alerts
INSERT INTO `reorder_alerts` (`id`, `item_id`, `status`, `created_at`) VALUES
(1, 5, 'Active', NOW()),
(2, 6, 'Active', NOW())
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Populate Activity Logs
INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `details`, `created_at`) VALUES
(1, 1, 'Database Initialized', 'Inventory database automatically seeded with preset materials.', NOW()),
(2, 3, 'Inventory Checked In', 'Counting Sheep mathematics kit checked in with current low stock.', NOW())
ON DUPLICATE KEY UPDATE `id`=`id`;
