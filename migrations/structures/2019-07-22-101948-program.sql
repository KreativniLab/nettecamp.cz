CREATE TABLE `program` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `author` varchar(200) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL
) ENGINE='InnoDB' COLLATE 'utf8mb4_czech_ci';