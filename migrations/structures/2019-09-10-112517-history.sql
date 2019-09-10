CREATE TABLE `history` (
                           `id` int(11) NOT NULL AUTO_INCREMENT,
                           `year` int(11) NOT NULL,
                           `name` varchar(250) COLLATE utf8mb4_czech_ci NOT NULL,
                           `location` varchar(250) COLLATE utf8mb4_czech_ci NOT NULL,
                           `attendance` int(11) NOT NULL,
                           `link_forum` varchar(250) COLLATE utf8mb4_czech_ci NOT NULL,
                           `link_facebook` varchar(250) COLLATE utf8mb4_czech_ci NOT NULL,
                           PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
