-- Adminer 4.3.1 MySQL dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `registration`;
CREATE TABLE `registration` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year` mediumint(9) NOT NULL,
  `name` varchar(250) COLLATE utf8mb4_czech_ci NOT NULL,
  `nickname` varchar(250) COLLATE utf8mb4_czech_ci DEFAULT NULL,
  `email` varchar(250) COLLATE utf8mb4_czech_ci NOT NULL,
  `phone` varchar(250) COLLATE utf8mb4_czech_ci NOT NULL,
  `arrival` varchar(100) COLLATE utf8mb4_czech_ci NOT NULL,
  `skills` varchar(100) COLLATE utf8mb4_czech_ci NOT NULL,
  `invoice` varchar(100) COLLATE utf8mb4_czech_ci NOT NULL,
  `vegetarian` varchar(100) COLLATE utf8mb4_czech_ci NOT NULL,
  `tshirt` varchar(100) COLLATE utf8mb4_czech_ci NOT NULL,
  `note` text COLLATE utf8mb4_czech_ci NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;


-- 2017-07-14 21:21:13