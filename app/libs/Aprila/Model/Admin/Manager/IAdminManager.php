<?php

/**
 * @author Honza Cerny (http://honzacerny.com)
 */
namespace Aprila\Model\Admin\Manager;

interface IAdminManager
{

	public function get($id = 0);


	public function findAll();


	public function add($data = []);


	public function edit($id = 0, $data = []);


	public function remove($id = 0);
}