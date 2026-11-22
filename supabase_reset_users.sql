-- Bản phác thảo cho project DA2. Khối xóa mặc định chỉ chạy thử và hoàn tác.
-- Chạy riêng các truy vấn kiểm tra trước khi chạy thử khối xóa.
select count(*) as auth_users from auth.users;

select conrelid::regclass as referencing_table, conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f' and confrelid = 'auth.users'::regclass;

select count(*) as analysis_sessions_linked_to_current_users
from public.bc_analysis_sessions as analysis
join auth.users as account on analysis.user_id = account.id::text;

select count(*) as storage_objects_owned_by_current_users
from storage.objects as object
join auth.users as account on object.owner_id = account.id::text;

-- Khối chạy thử. Xem lại phạm vi xóa và khóa ngoại trước khi đổi ROLLBACK thành COMMIT.
begin;
set local lock_timeout = '5s';
lock table auth.users in share row exclusive mode;

do $$
begin
    if (select count(*) from auth.users) <> 10 then
        raise exception 'DA2: số tài khoản khác 10. Kiểm tra lại danh sách trước khi xóa.';
    end if;
    if exists (
        select 1
        from storage.objects as object
        join auth.users as account on object.owner_id = account.id::text
    ) then
        raise exception 'DA2: có tài khoản đang sở hữu tệp trong Storage. Kiểm tra quyền sở hữu trước khi xóa.';
    end if;
end;
$$;

delete from public.profiles as profile
using auth.users as account
where profile.id = account.id;

delete from auth.users;

select count(*) as auth_users_after_delete from auth.users;
rollback;
