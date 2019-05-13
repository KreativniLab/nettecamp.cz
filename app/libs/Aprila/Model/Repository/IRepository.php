<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace Aprila\Model\Repository;

interface IRepository
{
	public function get($id = 0);


	public function getBy($condition, $parameters = array());


	public function findAll();


	public function findFulltext($query = '');


	public function insert($data = []);


	public function update($id = 0, $data = []);


	public function delete($id = 0);

}